import axios from 'axios';
import HttpsProxyAgent from 'https-proxy-agent';
import * as cheerio from 'cheerio';
import { duplicateRemoval, filterProxies, writeProxies, getSources, sleep, canCrawl } from './util.js';


function parseProxies(url, data){
    const $ = cheerio.load(data)
    const proxies = [];
    const origin = new URL(url).origin;
    switch(url){
        case 'https://free-proxy-list.net/en/socks-proxy.html':
            $('#list .table-responsive table tbody tr').each((_, row) => {
                    const tds = $(row).find('td');
                    const ip = $(tds[0]).text().trim();
                    const port = $(tds[1]).text().trim();
                    if(ip && port) {
                        proxies.push(`socks4://${ip}:${port}`)
                    }
                })
                return proxies
        default:
        switch (origin){
            case 'https://free-proxy-list.net':
                $('#list .table-responsive table tbody tr').each((_, row) => {
                    const tds = $(row).find('td');
                    const ip = $(tds[0]).text().trim();
                    const port = $(tds[1]).text().trim();
                    if(ip && port) {
                        proxies.push(`http://${ip}:${port}`)
                    }
                })
                return proxies
            case 'https://api.proxyscrape.com':
                proxies.push(...data.split('\n').map(line => line.trim()).filter(line => line.length > 0))
                return proxies
            case 'https://www.proxynova.com':
                $('#tbl_proxy_list tbody tr').each((_, row) => {
                    const tds = $(row).find('td');
                    $(tds[0]).find('script').remove();
                    const ip = $(tds[0]).text().trim();
                    const port = $(tds[1]).text().trim();
                    if(ip && port) {
                        proxies.push(`http://${ip}:${port}`)
                    }
                })
                return proxies
            default:
                console.warn(`No parser available for origin: ${origin}`);
                return [];
        }
    }
    
    
}
async function scrapeSources(axiosInstance, userAgent, sources){
    for(const url of sources) {
        await sleep(Math.floor(Math.random() * 1000) + 2000);
        console.log(`Checking robots.txt for: ${url}`);
        const allowed = await canCrawl(url, axiosInstance, userAgent);
        let proxies = []
        if(!allowed) {
            console.warn(`Blocked by robots.txt: ${url}`)
            continue;
        }
        console.log(`Scraping Source: ${url}`);
        try {
            const response = await axiosInstance.get(url);
            console.log(`Successfully Scraped: ${url}`);
            proxies = parseProxies(url, response.data);
        }
        catch (err) {
            console.warn(`Failed to scrape ${url}: ${err.message}`);
        }
        try {
            let newProxies = duplicateRemoval(proxies, './out/unsorted_proxies.txt');
            newProxies = filterProxies(newProxies, './out/sorted_proxies.txt');
            writeProxies(newProxies, './out/unsorted_proxies.txt');
        }
        catch (err) {
            console.warn(`failed to write Scraped data ${url}: ${err.message}`);
        }
    }
}



async function main() {
    const sources = getSources('./proxy-sources.txt');
    const agent = 'Mozilla/5.0 (compatible; super-duper-octo-disco/1.0; +https://github.com/Relimer/super-duper-octo-disco)';
    const instance = createAxiosInstance(null, agent);
    await scrapeSources(instance, agent, sources);
}

main();
