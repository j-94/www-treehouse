from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, validator
from crawl4ai.models import CrawlResult

class ProductItem(BaseModel):
    """Model for individual product items"""
    name: str = Field(..., description="Product name (required)")
    price: Optional[float] = Field(None, description="Product price")
    description: Optional[str] = Field(None, description="Product description")
    category: Optional[List[str]] = Field(None, description="Product categories")
    image: Optional[str] = Field(None, description="Product image URL")

    @validator('name')
    def name_must_not_be_empty(cls, v):
        if not v.strip():
            raise ValueError('Product name cannot be empty')
        return v.strip()

class MapLocation(BaseModel):
    """Model for map location data"""
    element: str = Field(..., description="Map element selector match")
    coordinates: Optional[dict] = Field(
        None,
        description="Map coordinates if available",
        example={"lat": 13.7563, "lng": 100.5018}
    )

class ShopData(BaseModel):
    """Model for cannabis shop data with validation"""
    # Required Basic Information
    name: str = Field(..., description="Shop name")
    description: str = Field(..., description="Shop description")
    rating: float = Field(..., description="Shop rating", ge=0, le=5)
    
    # Optional Basic Information
    reviews_count: Optional[int] = Field(None, description="Number of reviews", ge=0)
    verified: Optional[bool] = Field(None, description="Shop verification status")
    delivery_service: Optional[bool] = Field(None, description="Delivery service availability")
    special_offers: Optional[List[str]] = Field(None, description="Special offers")
    
    # Images
    images: dict = Field(
        ...,
        description="Shop images",
        example={
            "main": "https://example.com/main.jpg",
            "gallery": ["https://example.com/1.jpg"]
        }
    )
    
    # Products
    products: dict = Field(
        ...,
        description="Shop products",
        example={
            "categories": ["Flowers", "Edibles"],
            "items": [ProductItem]
        }
    )
    
    # Optional Contact Information
    contact: Optional[dict] = Field(
        None,
        description="Contact information",
        example={
            "website": "https://example.com",
            "line": "@shopname"
        }
    )
    
    # Required Location Information
    location: dict = Field(
        ...,
        description="Shop location",
        example={
            "area": "Bangkok",
            "map": MapLocation
        }
    )
    
    # Metadata
    metadata: dict = Field(
        default_factory=lambda: {
            "scrape_time": datetime.utcnow(),
            "missing_optional_fields": [],
            "validation_errors": []
        }
    )

    @validator('images')
    def validate_images(cls, v):
        if not v.get('main'):
            raise ValueError('Main image is required')
        return v

    @validator('products')
    def validate_products(cls, v):
        if not v.get('categories'):
            raise ValueError('At least one product category is required')
        if not v.get('items'):
            raise ValueError('At least one product item is required')
        return v

    @validator('location')
    def validate_location(cls, v):
        if not v.get('area'):
            raise ValueError('Location area is required')
        if not v.get('map'):
            raise ValueError('Location map is required')
        return v

    class Config:
        """Pydantic model configuration"""
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
        schema_extra = {
            "example": {
                "name": "Sample Shop",
                "description": "A great cannabis shop",
                "rating": 4.5,
                "reviews_count": 100,
                "verified": True,
                "delivery_service": True,
                "special_offers": ["30% off for medical card holders"],
                "images": {
                    "main": "https://example.com/main.jpg",
                    "gallery": ["https://example.com/1.jpg"]
                },
                "products": {
                    "categories": ["Flowers", "Edibles"],
                    "items": [
                        {
                            "name": "Sample Product",
                            "price": 100.0,
                            "description": "Great product",
                            "category": ["AAAA", "Sativa"],
                            "image": "https://example.com/product.jpg"
                        }
                    ]
                },
                "contact": {
                    "website": "https://example.com",
                    "line": "@shopname"
                },
                "location": {
                    "area": "Bangkok",
                    "map": {
                        "element": "div.map",
                        "coordinates": {
                            "lat": 13.7563,
                            "lng": 100.5018
                        }
                    }
                }
            }
        } 