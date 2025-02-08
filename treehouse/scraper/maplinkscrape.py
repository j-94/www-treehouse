#!/usr/bin/env python3
"""
Map Link Scraper
---------------
Scrapes Google Maps links from weed.th shop pages using Playwright for full JavaScript support.
"""

import asyncio
import json
from datetime import datetime
from typing import Dict, List, Optional
from pathlib import Path
from playwright.async_api import async_playwright, Browser, Page
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn
from pydantic import BaseModel

console = Console()

class MapLink(BaseModel):
    """Model for map link data"""
    url: str
    shop_id: str
    maps_link: Optional[str] = None
    maps_short_link: Optional[str] = None
    timestamp: datetime = datetime.now()

async def setup_browser() -> Browser:
    """Setup Playwright browser with proper configuration"""
    playwright = await async_playwright().start()
    browser = await playwright.chromium.launch(
        headless=True,
        args=['--no-sandbox', '--disable-dev-shm-usage']
    )
    return browser

async def extract_map_links(page: Page, url: str) -> MapLink:
    """Extract map links from a loaded page"""
    # Wait for network to be idle and a bit more time for JS to execute
    await page.wait_for_load_state('networkidle')
    await asyncio.sleep(2)  # Give extra time for dynamic content

    # Get shop ID from URL
    shop_id = url.split('/shop/')[1].split('/')[0] if '/shop/' in url else None
    
    # Initialize result
    result = MapLink(url=url, shop_id=shop_id)
    
    try:
        # Wait for map container to load
        await page.wait_for_selector('.layout_map__AFkLI', timeout=10000)
        
        # Wait for loading message to disappear
        try:
            await page.wait_for_selector('.layout_loading__SwQkD', state='hidden', timeout=10000)
        except:
            console.log(f"[yellow]Warning: Loading indicator didn't disappear for {url}")
        
        # Look for map links
        for selector in ['a[href*="maps.app.goo.gl"]', 'a[href*="goo.gl/maps"]', 'a[href*="maps.google.com"]']:
            try:
                element = await page.wait_for_selector(selector, timeout=5000)
                if element:
                    href = await element.get_attribute('href')
                    if 'maps.app.goo.gl' in href:
                        result.maps_short_link = href
                    else:
                        result.maps_link = href
                    break
            except:
                continue
                
        if not result.maps_link and not result.maps_short_link:
            console.log(f"[yellow]No map links found for {url}")
            
    except Exception as e:
        console.log(f"[red]Error extracting map links from {url}: {str(e)}")
        
    return result

async def scrape_shop_urls(limit: int = 100) -> List[str]:
    """Scrape shop URLs from multiple pages until we have enough"""
    urls = []
    page = 1
    base_url = "https://weed.th/cannabis/bangkok"
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page_obj = await context.new_page()
        
        while len(urls) < limit:
            url = f"{base_url}?page={page}"
            await page_obj.goto(url)
            await page_obj.wait_for_load_state('networkidle')
            
            # Extract shop URLs from the current page
            shop_links = await page_obj.query_selector_all('a[href^="/shop/"]')
            for link in shop_links:
                href = await link.get_attribute('href')
                if href and '/shop/' in href and not href.endswith('/shop/'):
                    full_url = f"https://weed.th{href}"
                    if full_url not in urls:
                        urls.append(full_url)
                        if len(urls) >= limit:
                            break
            
            page += 1
            if page > 20:  # Safety limit
                break
    
    return urls[:limit]

async def main():
    """Main execution function"""
    # Setup output directory
    output_dir = Path("treehouse/scraper/results")
    output_dir.mkdir(exist_ok=True)
    
    # Get shop URLs
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console
    ) as progress:
        task = progress.add_task("Discovering shop URLs...", total=None)
        urls = await scrape_shop_urls(limit=100)
        progress.update(task, description=f"Found {len(urls)} shop URLs")
        
        # Setup browser
        browser = await setup_browser()
        results = []
        
        # Process each URL
        task = progress.add_task("Scraping map links...", total=len(urls))
        for url in urls:
            try:
                context = await browser.new_context()
                page = await context.new_page()
                await page.goto(url)
                result = await extract_map_links(page, url)
                results.append(result.dict())
                await context.close()
            except Exception as e:
                console.log(f"[red]Error processing {url}: {str(e)}")
            progress.advance(task)
            
        # Save results
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = output_dir / f"map_links_{timestamp}.json"
        with open(output_file, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        
        console.log(f"[green]Saved {len(results)} results to {output_file}")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main()) 