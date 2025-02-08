from typing import Dict, Any, List, Optional
from crawl4ai.extraction_strategy import JsonCssExtractionStrategy
from crawl4ai.async_logger import AsyncLogger
from bs4 import BeautifulSoup
from .models import ShopData, ProductItem, MapLocation

class ShopExtractionStrategy(JsonCssExtractionStrategy):
    """Custom extraction strategy for cannabis shop data"""
    
    def __init__(self):
        # Define selectors from our prompt
        selectors = {
            # Required Basic Information
            "name": "h1",
            "description": "div[style*='white-space:pre-wrap']",
            "rating": "div[style*='text-align:center'] img[alt='rating']",
            
            # Optional Basic Information
            "reviews.count": "div[style*='text-align:center'] div[style*='font-size:22px']",
            "verified": "div[style*='color: rgb(74, 153, 233)']",
            "status.delivery": "div[style*='color: rgb(74, 153, 233)']",
            "special_offers": "div._Dispensary_medcardHeader___L6AM",
            
            # Images
            "images.main": "div.FeaturedImage_featuredImage__GA2Cw img[alt*='og.th']",
            "images.gallery": "div.FeaturedImage_featuredImage__GA2Cw img[loading='eager']",
            
            # Products
            "products.categories": "h2.ShopProductAll_productsHeader__10hBt",
            "products.items": "div.ShopProductAll_product__Cc_k7",
            "products.item.name": "div.ShopProductAll_header__BSmhH a",
            "products.item.price": "div.ShopProductAll_prices__pWISY",
            "products.item.description": "div.ShopProductAll_description__ItGaW",
            "products.item.category": "div.ShopProductAll_chips__jqQLw div div",
            "products.item.image": "div.ShopProductAll_imageContainer__1TiEr img",
            
            # Contact
            "contact.website": "div[style*='border:1px solid #04b14e'] svg[width='26'][height='26']",
            "contact.line": "div[style*='border:1px solid #04b14e'] path[d*='M256 64C150']",
            
            # Location
            "location.area": "h2 a[href*='/cannabis/']",
            "location.map": "div.layout_map__AFkLI"
        }
        super().__init__(selectors)
        self.logger = AsyncLogger.get_logger(__name__)

    async def extract(self, html: str, **kwargs) -> Dict[str, Any]:
        """Extract and validate shop data from HTML"""
        soup = BeautifulSoup(html, 'lxml')
        raw_data = await super().extract(html, **kwargs)
        
        # Track missing optional fields
        missing_optional_fields = []
        
        try:
            # Process basic information
            shop_data = {
                "name": self._get_text(raw_data, "name"),
                "description": self._get_text(raw_data, "description"),
                "rating": self._parse_rating(raw_data.get("rating")),
                "reviews_count": self._parse_reviews_count(raw_data.get("reviews.count")),
                "verified": bool(raw_data.get("verified")),
                "delivery_service": bool(raw_data.get("status.delivery")),
                "special_offers": self._parse_special_offers(raw_data.get("special_offers")),
                
                # Process images
                "images": {
                    "main": self._get_image_url(raw_data, "images.main"),
                    "gallery": self._get_gallery_urls(raw_data.get("images.gallery", []))
                },
                
                # Process products
                "products": self._process_products(raw_data),
                
                # Process contact information
                "contact": self._process_contact(raw_data),
                
                # Process location
                "location": self._process_location(raw_data, soup)
            }
            
            # Validate data using our Pydantic model
            validated_data = ShopData(
                **shop_data,
                metadata={
                    "missing_optional_fields": missing_optional_fields,
                    "validation_errors": []
                }
            )
            
            return validated_data.dict()
            
        except Exception as e:
            self.logger.error(f"Error extracting shop data: {str(e)}")
            raise
    
    def _get_text(self, data: Dict[str, Any], field: str) -> str:
        """Extract text from a field, handling missing values"""
        value = data.get(field, "").strip()
        if not value and field not in ["reviews.count", "verified", "status.delivery", "special_offers"]:
            raise ValueError(f"Required field '{field}' is missing")
        return value
    
    def _get_image_url(self, data: Dict[str, Any], field: str) -> str:
        """Extract image URL, handling missing values"""
        if field not in data or not data[field]:
            raise ValueError(f"Required image field '{field}' is missing")
        return data[field][0].get("src", "") if isinstance(data[field], list) else ""
    
    def _get_gallery_urls(self, gallery_data: List) -> List[str]:
        """Extract gallery image URLs"""
        return [img.get("src", "") for img in gallery_data if img.get("src")]
    
    def _parse_rating(self, rating_data: Any) -> float:
        """Parse rating value from image alt text or data attribute"""
        if not rating_data:
            raise ValueError("Rating is required")
        # Extract numeric rating value from the rating element
        # This might need adjustment based on how the rating is stored
        try:
            return float(rating_data[0].get("alt", "0").split()[0])
        except (IndexError, ValueError):
            return 0.0
    
    def _parse_reviews_count(self, reviews_data: Any) -> Optional[int]:
        """Parse reviews count, returning None if not available"""
        if not reviews_data:
            return None
        try:
            # Extract numeric value from reviews count text
            text = reviews_data[0].get_text(strip=True)
            return int(''.join(filter(str.isdigit, text)))
        except (ValueError, AttributeError):
            return None
    
    def _parse_special_offers(self, offers_data: Any) -> List[str]:
        """Parse special offers into a list"""
        if not offers_data:
            return []
        return [offer.get_text(strip=True) for offer in offers_data if offer.get_text(strip=True)]
    
    def _process_products(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Process product information"""
        products = {
            "categories": [],
            "items": []
        }
        
        # Extract categories
        if "products.categories" in data:
            products["categories"] = [
                cat.get_text(strip=True) 
                for cat in data["products.categories"]
            ]
        
        # Extract product items
        if "products.items" in data:
            for item in data["products.items"]:
                product = ProductItem(
                    name=item.select_one(self.selectors["products.item.name"]).get_text(strip=True),
                    price=self._parse_price(item.select_one(self.selectors["products.item.price"])),
                    description=item.select_one(self.selectors["products.item.description"]).get_text(strip=True) if item.select_one(self.selectors["products.item.description"]) else None,
                    category=[cat.get_text(strip=True) for cat in item.select(self.selectors["products.item.category"])],
                    image=item.select_one(self.selectors["products.item.image"]).get("src") if item.select_one(self.selectors["products.item.image"]) else None
                )
                products["items"].append(product.dict())
        
        return products
    
    def _process_contact(self, data: Dict[str, Any]) -> Optional[Dict[str, str]]:
        """Process contact information"""
        contact = {}
        
        if "contact.website" in data and data["contact.website"]:
            contact["website"] = data["contact.website"][0].get("href", "")
        
        if "contact.line" in data and data["contact.line"]:
            contact["line"] = data["contact.line"][0].get("href", "")
        
        return contact if contact else None
    
    def _process_location(self, data: Dict[str, Any], soup: BeautifulSoup) -> Dict[str, Any]:
        """Process location information"""
        location = {
            "area": self._get_text(data, "location.area"),
            "map": self._process_map(data.get("location.map", []), soup)
        }
        return location
    
    def _process_map(self, map_data: List, soup: BeautifulSoup) -> Dict[str, Any]:
        """Process map information including coordinates"""
        if not map_data:
            raise ValueError("Map element is required")
            
        map_element = map_data[0]
        map_location = MapLocation(
            element=str(map_element),
            coordinates={
                "lat": float(map_element.get("data-lat")) if map_element.get("data-lat") else None,
                "lng": float(map_element.get("data-lng")) if map_element.get("data-lng") else None
            } if map_element.get("data-lat") and map_element.get("data-lng") else None
        )
        return map_location.dict()
    
    def _parse_price(self, price_element: Any) -> Optional[float]:
        """Parse price value from element"""
        if not price_element:
            return None
        try:
            # Extract numeric value from price text
            text = price_element.get_text(strip=True)
            return float(''.join(filter(str.isdigit, text)))
        except (ValueError, AttributeError):
            return None 