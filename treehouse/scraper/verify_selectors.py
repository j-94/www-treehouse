#!/usr/bin/env sh
#!/usr/bin/env -S uv run --script --quiet
# /// script
# requires-python = "~=3.11"
# dependencies = [
#     "crawl4ai>=0.4.3",
#     "rich>=13.0.0",  # For pretty printing
#     "beautifulsoup4>=4.12.0",
#     "lxml>=5.0.0",
#     "pydantic>=2.0.0"  # For validation
# ]
# ///

""":"
which uv >/dev/null \
    || curl -LsSf https://astral.sh/uv/install.sh | sh \
    && tail -n +3 $0 | $(head -n 2 $0 | tail -n 1 | cut -c 3-) - "$@"
exit $?
":"""

#region Documentation
"""
UV File: verify_selectors.uv
Purpose: Verify CSS selectors for weed.th shop pages
Dependencies: Listed in script header
Usage: ./verify_selectors.uv [URL]
Author: Assistant
Date: 2024-03-21
"""
#endregion

import asyncio
import json
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple, Set
from pathlib import Path
from rich.console import Console
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.panel import Panel
from rich.syntax import Syntax
from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig
from crawl4ai.extraction_strategy import JsonCssExtractionStrategy
from bs4 import BeautifulSoup
from pydantic import BaseModel, Field

# Initialize rich console for pretty printing
console = Console()

class SelectorValidationResult(BaseModel):
    """Model for selector validation results"""
    found: bool
    count: int
    samples: List[Dict[str, Any]]
    is_required: bool
    validation_errors: List[str] = Field(default_factory=list)
    validation_warnings: List[str] = Field(default_factory=list)
    extracted_value: Optional[Any] = None
    html_context: Optional[str] = None

class ValidationReport(BaseModel):
    """Model for validation report"""
    url: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    results: Dict[str, Dict[str, SelectorValidationResult]]
    missing_required: List[str] = Field(default_factory=list)
    optional_present: int = 0
    total_optional: int = 0
    validation_errors: List[str] = Field(default_factory=list)
    validation_warnings: List[str] = Field(default_factory=list)
    html_saved: bool = False
    html_path: Optional[str] = None

# Define which fields are required
REQUIRED_FIELDS = {
    "basic": ["name", "description", "rating"],
    "images": ["main"],
    "products": ["categories", "items", "item.name"],
    "location": ["area", "coordinates", "map"]
}

def get_text_safely(element) -> str:
    """Safely get text from a BeautifulSoup element or ResultSet"""
    if not element:
        return ""
    if isinstance(element, list):
        return element[0].get_text(strip=True) if element else ""
    try:
        return element.get_text(strip=True)
    except AttributeError:
        return str(element)

def get_attr_safely(element, attr: str) -> str:
    """Safely get attribute from a BeautifulSoup element or ResultSet"""
    if not element:
        return ""
    if isinstance(element, list):
        return element[0].get(attr, "") if element else ""
    try:
        return element.get(attr, "")
    except AttributeError:
        return ""

def get_first_element(elements):
    """Safely get first element from BeautifulSoup find/find_all results"""
    if not elements:
        return None
    if isinstance(elements, list):
        return elements[0] if elements else None
    return elements

# Updated selectors for location
SELECTORS_TO_TEST = {
    "basic": {
        "name": {
            "selector": "h1",
            "required": True,
            "validation": lambda x: bool(get_text_safely(get_first_element(x))),
            "error_msg": "Shop name must not be empty"
        },
        "description": {
            "selector": "div[style*='white-space:pre-wrap']",
            "required": True,
            "validation": lambda x: bool(get_text_safely(get_first_element(x))),
            "error_msg": "Description must not be empty"
        },
        "rating": {
            "selector": "div[style*='text-align:center'] img[alt='rating']",
            "required": True,
            "validation": lambda x: bool(get_attr_safely(get_first_element(x), "alt")),
            "error_msg": "Rating must have alt text"
        },
        "reviews.count": {
            "selector": "div[style*='text-align:center'] div[style*='font-size:22px']",
            "required": False,
            "validation": lambda x: bool(x and any(c.isdigit() for c in get_text_safely(get_first_element(x)))),
            "warning_msg": "Reviews count should contain numbers"
        },
        "verified": {
            "selector": "div[style*='color: rgb(74, 153, 233)']",
            "required": False
        },
        "status.delivery": {
            "selector": "div[style*='color: rgb(74, 153, 233)']",
            "required": False
        },
        "special_offers": {
            "selector": "div._Dispensary_medcardHeader___L6AM",
            "required": False
        }
    },
    "images": {
        "main": {
            "selector": "div.FeaturedImage_featuredImage__GA2Cw img[alt*='og.th']",
            "required": True,
            "validation": lambda x: bool(get_attr_safely(get_first_element(x), "src")),
            "error_msg": "Main image must have src attribute"
        },
        "gallery": {
            "selector": "div.FeaturedImage_featuredImage__GA2Cw img[loading='eager']",
            "required": False,
            "validation": lambda x: all(get_attr_safely(img, "src") for img in (x if isinstance(x, list) else [x])),
            "warning_msg": "Gallery images should have src attributes"
        }
    },
    "products": {
        "categories": {
            "selector": "h2.ShopProductAll_productsHeader__10hBt",
            "required": True,
            "validation": lambda x: bool(get_text_safely(get_first_element(x))),
            "error_msg": "At least one product category is required"
        },
        "items": {
            "selector": "div.ShopProductAll_product__Cc_k7",
            "required": True,
            "validation": lambda x: bool(x and (isinstance(x, list) and len(x) > 0 or not isinstance(x, list))),
            "error_msg": "At least one product item is required"
        },
        "item.name": {
            "selector": "div.ShopProductAll_header__BSmhH a",
            "required": True,
            "validation": lambda x: bool(get_text_safely(get_first_element(x))),
            "error_msg": "Product name must not be empty"
        },
        "item.price": {
            "selector": "div.ShopProductAll_prices__pWISY",
            "required": False,
            "validation": lambda x: bool(x and any(c.isdigit() for c in get_text_safely(get_first_element(x)))),
            "warning_msg": "Price should contain numbers"
        },
        "item.description": {
            "selector": "div.ShopProductAll_description__ItGaW",
            "required": False
        },
        "item.category": {
            "selector": "div.ShopProductAll_chips__jqQLw div div",
            "required": False
        },
        "item.image": {
            "selector": "div.ShopProductAll_imageContainer__1TiEr img",
            "required": False,
            "validation": lambda x: bool(x and x.get("src")),
            "warning_msg": "Product image should have src attribute"
        }
    },
    "contact": {
        "website": {
            "selector": "div[style*='border:1px solid #04b14e'] svg[width='26'][height='26']",
            "required": False
        },
        "line": {
            "selector": "div[style*='border:1px solid #04b14e'] path[d*='M256 64C150']",
            "required": False
        }
    },
    "location": {
        "area": {
            "selector": "h2 a[href*='/cannabis/']",
            "required": True,
            "validation": lambda x: bool(x and x.get_text().strip()),
            "error_msg": "Area must not be empty"
        },
        "coordinates": {
            "selector": "div.layout_map__AFkLI",  # Map container
            "required": True,
            "validation": lambda x: bool(
                x and 
                x.get('data-lng') and 
                x.get('data-lat')
            ),
            "extract": lambda x: {
                "lng": x.get('data-lng'),
                "lat": x.get('data-lat')
            } if x else None,
            "error_msg": "Map coordinates not found in data attributes"
        },
        "map_provider": {
            "selector": "div.layout_map__AFkLI",
            "required": True,
            "validation": lambda x: "mapbox" in str(x).lower(),
            "error_msg": "Map provider should be Mapbox"
        },
        "place_name": {
            "selector": "h1",  # Shop name in the header
            "required": True,
            "validation": lambda x: bool(get_text_safely(x)),
            "error_msg": "Shop name is required"
        },
        "map": {
            "selector": "div.layout_map__AFkLI",
            "required": True,
            "validation": lambda x: bool(x),
            "error_msg": "Map element is required"
        }
    }
}

# Sample data for validation testing
SAMPLE_DATA = {
    "location": {
        "google_maps_link": [
            {
                "html": '<a href="https://maps.app.goo.gl/example123" class="map-link">View on Map</a>',
                "expected": True
            },
            {
                "html": '<a href="https://www.google.com/maps/place/Shop+Name" class="map-link">Directions</a>',
                "expected": True
            },
            {
                "html": '<a href="https://www.google.com/maps/contrib/123456" class="map-link">Review</a>',
                "expected": False
            },
            {
                "html": '<div data-map-url="https://maps.app.goo.gl/example123">Map</div>',
                "expected": True
            }
        ],
        "coordinates": [
            {
                "html": '<div data-lat="13.7563" data-lng="100.5018">Location</div>',
                "expected": True
            },
            {
                "html": '<meta property="place:location:latitude" content="13.7563"><meta property="place:location:longitude" content="100.5018">',
                "expected": True
            },
            {
                "html": '<script type="application/ld+json">{"coordinates":{"lat":13.7563,"lng":100.5018}}</script>',
                "expected": True
            }
        ]
    }
}

def get_html_context(soup: BeautifulSoup, element: Any, context_lines: int = 2) -> str:
    """Get HTML context around an element"""
    if not element:
        return ""
    
    # Get the element's HTML
    element_html = str(element)
    
    # Find the element's position in the full HTML
    full_html = str(soup)
    pos = full_html.find(element_html)
    
    if pos == -1:
        return element_html
    
    # Get context before and after
    start = max(0, pos - 200)
    end = min(len(full_html), pos + len(element_html) + 200)
    
    context = full_html[start:end]
    
    # Add ellipsis if truncated
    if start > 0:
        context = "..." + context
    if end < len(full_html):
        context += "..."
    
    return context

async def validate_selector(soup: BeautifulSoup, section: str, field: str, config: dict) -> SelectorValidationResult:
    """Validate a single selector"""
    selector = config["selector"]
    is_required = config["required"]
    
    elements = soup.select(selector)
    
    result = SelectorValidationResult(
        found=len(elements) > 0,
        count=len(elements),
        samples=[{"text": get_text_safely(e), "attributes": dict(e.attrs)} for e in elements[:3]],
        is_required=is_required
    )
    
    if 'extract' in config:
        result.extracted_value = config['extract'](elements[0] if elements else None)

    # Get samples and context
    for elem in elements[:3]:
        try:
            # Special handling for coordinates and Google Maps links
            if section == "location":
                if field == "coordinates":
                    sample = {
                        "text": f"lat: {elem.get('data-lat', 'N/A')}, lng: {elem.get('data-lng', 'N/A')}",
                        "attributes": {
                            "lat": elem.get('data-lat'),
                            "lng": elem.get('data-lng')
                        },
                        "html": str(elem)
                    }
                elif field == "google_maps_link":
                    href = elem.get('href', '')
                    sample = {
                        "text": href,
                        "attributes": {"href": href},
                        "html": str(elem)
                    }
                else:
                    sample = {
                        "text": get_text_safely(elem),
                        "attributes": elem.attrs if hasattr(elem, 'attrs') else {},
                        "html": str(elem)
                    }
            else:
                sample = {
                    "text": get_text_safely(elem),
                    "attributes": elem.attrs if hasattr(elem, 'attrs') else {},
                    "html": str(elem)
                }
            result.samples.append(sample)
            if not result.html_context:
                result.html_context = get_html_context(soup, elem)
        except Exception as e:
            result.validation_errors.append(f"Error getting sample: {str(e)}")
    
    # Validate if validator exists
    if "validation" in config and elements:
        try:
            if not config["validation"](elements[0] if isinstance(elements, list) else elements):
                message = config.get("error_msg" if is_required else "warning_msg", "Validation failed")
                if is_required:
                    result.validation_errors.append(message)
                else:
                    result.validation_warnings.append(message)
        except Exception as e:
            result.validation_errors.append(f"Validation error: {str(e)}")
    
    return result

async def verify_selectors(url: str) -> ValidationReport:
    """Verify CSS selectors on a given URL using crawl4ai"""
    browser_config = BrowserConfig(
        browser_type="chromium",
        headless=True,
        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    )
    
    # Configure crawler with minimal settings
    crawler_config = CrawlerRunConfig(
        word_count_threshold=0,
        screenshot=False,
        cache_mode=None
    )

    results = {}
    validation_errors = []
    validation_warnings = []
    
    async with AsyncWebCrawler(config=browser_config) as crawler:
        # First load the page
        result = await crawler.arun(url=url, config=crawler_config)
        soup = BeautifulSoup(result.html, 'lxml')
        
        # Look for Google Maps links
        map_links = soup.select('a[href*="maps.app.goo.gl"]')
        if map_links:
            console.print("[green]Found Google Maps link(s):[/green]")
            for link in map_links:
                console.print(f"  • {link.get('href', '')}")
            map_loaded = True
        else:
            # Try alternative link formats
            map_links = soup.select('a[href*="goo.gl/maps"]')
            if map_links:
                console.print("[green]Found Google Maps short link(s):[/green]")
                for link in map_links:
                    console.print(f"  • {link.get('href', '')}")
                map_loaded = True
            else:
                console.print("[red]No Google Maps links found![/red]")
                validation_warnings.append("No Google Maps links found")
                map_loaded = False
        
        # Debug: Log all links containing 'maps' for verification
        all_map_links = soup.select('a[href*="maps"]')
        if all_map_links:
            console.print("[yellow]All map-related links found:[/yellow]")
            for link in all_map_links:
                href = link.get('href', '')
                if 'maps.app.goo.gl' in href or 'goo.gl/maps' in href:
                    console.print(f"  • [green]{href}[/green]")
                else:
                    console.print(f"  • {href}")
        
        # Parse final HTML for other validations
        soup = BeautifulSoup(result.html, 'lxml')
        
        # Debug: Log the map section HTML
        map_section = soup.select_one('.layout_map__AFkLI')
        if map_section:
            console.print("[yellow]Map section found:[/yellow]")
            console.print(Panel(Syntax(str(map_section), "html", theme="monokai")))
        else:
            console.print("[red]No map section found![/red]")
        
        # Validate selectors
        for section, fields in SELECTORS_TO_TEST.items():
            results[section] = {}
            for field, config in fields.items():
                results[section][field] = await validate_selector(soup, section, field, config)
    
    # Process results
    missing_required = []
    optional_present = 0
    total_optional = 0
    
    for section, fields in results.items():
        for field, result in fields.items():
            if result.is_required:
                if not result.found or result.validation_errors:
                    missing_required.append(f"{section}.{field}")
                    validation_errors.extend(result.validation_errors)
            else:
                total_optional += 1
                if result.found and not result.validation_warnings:
                    optional_present += 1
                if result.validation_warnings:
                    validation_warnings.extend(result.validation_warnings)
    
    return ValidationReport(
        url=url,
        results=results,
        missing_required=missing_required,
        optional_present=optional_present,
        total_optional=total_optional,
        validation_errors=validation_errors,
        validation_warnings=validation_warnings,
        html_saved=True,
        html_path="(path not changed in this example)"
    )

def print_validation_report(report: ValidationReport):
    """Print validation results in a nice format"""
    console.print(f"\n[bold]Validation Report for[/bold] {report.url}")
    console.print(f"[dim]Timestamp:[/dim] {report.timestamp}")
    
    # Print validation summary
    console.print("\n[bold cyan]Validation Summary:[/bold cyan]")
    if report.validation_errors:
        console.print("[bold red]Errors:[/bold red]")
        for error in report.validation_errors:
            console.print(f"  ❌ {error}")
    
    if report.validation_warnings:
        console.print("\n[bold yellow]Warnings:[/bold yellow]")
        for warning in report.validation_warnings:
            console.print(f"  ⚠️  {warning}")
    
    # Print results table
    table = Table(title="Selector Validation Results")
    table.add_column("Section/Field", style="cyan", no_wrap=True)
    table.add_column("Required", style="magenta", justify="center")
    table.add_column("Found", style="green", justify="center")
    table.add_column("Valid", style="yellow", justify="center")
    table.add_column("Count", style="blue", justify="right")
    table.add_column("Sample", style="white")
    
    for section, fields in report.results.items():
        table.add_row(f"[bold]{section}[/bold]", "", "", "", "", "")
        for field, result in fields.items():
            # Determine status indicators
            required = "✓" if result.is_required else "-"
            found = "✓" if result.found else "✗"
            valid = "✓" if not (result.validation_errors or result.validation_warnings) else "⚠️"
            
            # Get sample text
            sample = (result.samples[0]["text"][:50] + "...") if result.samples else "None"
            
            # Add row with appropriate styling
            if result.is_required and (not result.found or result.validation_errors):
                table.add_row(
                    f"[red]  {section}.{field}[/red]",
                    required, found, valid, str(result.count), sample
                )
            elif result.validation_warnings:
                table.add_row(
                    f"[yellow]  {section}.{field}[/yellow]",
                    required, found, valid, str(result.count), sample
                )
            else:
                table.add_row(
                    f"  {section}.{field}",
                    required, found, valid, str(result.count), sample
                )
    
    console.print(table)
    
    # Print summary statistics
    console.print("\n[bold]Summary Statistics:[/bold]")
    console.print(f"Required Fields: [{'green' if not report.missing_required else 'red'}]{len(REQUIRED_FIELDS)} - {len(report.missing_required)} missing = {len(REQUIRED_FIELDS) - len(report.missing_required)} present[/]")
    console.print(f"Optional Fields: [cyan]{report.optional_present}/{report.total_optional} present[/]")
    
    if report.html_saved:
        console.print(f"\n[dim]HTML saved to: {report.html_path}[/dim]")

async def discover_shop_urls(base_url: str = "https://weed.th/cannabis/bangkok") -> List[str]:
    """Discover actual shop URLs from the cannabis directory"""
    browser_config = BrowserConfig(
        browser_type="chromium",
        headless=True,
        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    )
    
    crawler_config = CrawlerRunConfig(
        word_count_threshold=0,
        screenshot=False,
        cache_mode=None
    )
    
    shop_urls = set()
    
    async with AsyncWebCrawler(config=browser_config) as crawler:
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console
        ) as progress:
            task = progress.add_task("Discovering shop URLs...", total=None)
            
            # Crawl the directory page
            result = await crawler.arun(url=base_url, config=crawler_config)
            soup = BeautifulSoup(result.html, 'lxml')
            
            # Find shop links - adjust selector based on actual HTML structure
            shop_links = soup.select("a[href*='/shop/']")
            for link in shop_links:
                href = link.get('href')
                if href and '/shop/' in href:
                    full_url = f"https://weed.th{href}" if href.startswith('/') else href
                    shop_urls.add(full_url)
            
            progress.update(task, completed=True)
    
    return list(shop_urls)[:10]  # Limit to 10 shops for testing

async def main():
    """Main function"""
    console.print("[bold]Discovering valid shop URLs...[/bold]")
    urls = await discover_shop_urls()
    
    if not urls:
        console.print("[bold red]No valid shop URLs found![/bold red]")
        return
    
    console.print(f"[green]Found {len(urls)} shop URLs[/green]")
    for url in urls:
        console.print(f"  • {url}")
    
    # Track overall statistics
    total_stats = {
        "total_urls": len(urls),
        "successful_validations": 0,
        "failed_validations": 0,
        "total_required_fields": 0,
        "total_required_present": 0,
        "total_optional_fields": 0,
        "total_optional_present": 0,
        "common_errors": {},
        "field_presence_rates": {}
    }
    
    # Initialize field presence tracking
    for section, fields in SELECTORS_TO_TEST.items():
        for field in fields:
            total_stats["field_presence_rates"][f"{section}.{field}"] = {
                "present": 0,
                "total": 0,
                "required": fields[field]["required"]
            }
    
    for url in urls:
        try:
            console.print(f"\n[bold]Verifying selectors for:[/bold] {url}")
            report = await verify_selectors(url)
            
            # Print results
            print_validation_report(report)
            
            # Save detailed results
            shop_id = url.split("/")[-2]
            results_file = f"validation_report_{shop_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            with open(results_file, "w", encoding="utf-8") as f:
                json.dump(report.model_dump(), f, ensure_ascii=False, indent=2, default=str)
            
            console.print(f"\n[bold green]Detailed results saved to {results_file}[/bold green]")
            
            # Update statistics
            total_stats["successful_validations"] += 1
            total_stats["total_required_fields"] += len(report.missing_required)
            total_stats["total_required_present"] += (len(REQUIRED_FIELDS) - len(report.missing_required))
            total_stats["total_optional_fields"] += report.total_optional
            total_stats["total_optional_present"] += report.optional_present
            
            # Track field presence
            for section, fields in report.results.items():
                for field, result in fields.items():
                    field_key = f"{section}.{field}"
                    total_stats["field_presence_rates"][field_key]["total"] += 1
                    if result.found and not result.validation_errors:
                        total_stats["field_presence_rates"][field_key]["present"] += 1
            
            # Track common errors
            for error in report.validation_errors:
                total_stats["common_errors"][error] = total_stats["common_errors"].get(error, 0) + 1
            
        except Exception as e:
            console.print(f"[bold red]Error processing {url}:[/bold red] {str(e)}")
            total_stats["failed_validations"] += 1
            continue
    
    # Print overall statistics
    console.print("\n[bold cyan]Overall Validation Statistics:[/bold cyan]")
    console.print(f"Total URLs processed: {total_stats['total_urls']}")
    console.print(f"Successful validations: {total_stats['successful_validations']}")
    console.print(f"Failed validations: {total_stats['failed_validations']}")
    
    # Field presence rates
    console.print("\n[bold]Field Presence Rates:[/bold]")
    table = Table(title="Field Presence Statistics")
    table.add_column("Field", style="cyan")
    table.add_column("Present", style="green", justify="right")
    table.add_column("Total", style="blue", justify="right")
    table.add_column("Rate", style="yellow", justify="right")
    table.add_column("Required", style="magenta", justify="center")
    
    for field, stats in sorted(total_stats["field_presence_rates"].items()):
        if stats["total"] > 0:
            rate = (stats["present"] / stats["total"]) * 100
            table.add_row(
                field,
                str(stats["present"]),
                str(stats["total"]),
                f"{rate:.1f}%",
                "✓" if stats["required"] else "-"
            )
    
    console.print(table)
    
    # Common errors
    if total_stats["common_errors"]:
        console.print("\n[bold red]Common Errors:[/bold red]")
        for error, count in sorted(total_stats["common_errors"].items(), key=lambda x: x[1], reverse=True):
            console.print(f"[red]{count}x[/red] {error}")
    
    # Save overall statistics
    stats_file = f"validation_stats_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(stats_file, "w", encoding="utf-8") as f:
        json.dump(total_stats, f, ensure_ascii=False, indent=2, default=str)
    
    console.print(f"\n[bold green]Overall statistics saved to {stats_file}[/bold green]")

if __name__ == "__main__":
    asyncio.run(main()) 