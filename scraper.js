import axios from 'axios';
import HttpsProxyAgent from 'https-proxy-agent';
import * as cheerio from 'cheerio';
import fs from 'fs';
import robotsParser from 'robots-parser';
import { duplicateRemoval, writeProxies } from './write_output.js';

function createAxiosInstance(proxyURL, userAgent){
    const headers = { 'User-Agent': userAgent, 
                        'Accept-Language': 'en-US,en;q=0.9', 
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8', 
                        'Connection': 'keep-alive', 
                    }
    if(proxyURL){
        console.log(`Using Proxy: ${proxyURL}`);
        const agent = new HttpsProxyAgent(proxyURL);
        return axios.create({ httpAgent: agent, httpsAgent: agent, headers, timeout:5000, proxy: false, });
    }
    else {
        console.warn('No Proxy Used.');
        return axios.create({ headers, timeout:5000, });
    }
}
function getSources(sourceFile){
    const sources = fs.readFileSync(sourceFile, 'utf8')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
    console.log(`Found Sources: ${sources}`);
    return sources;
}
async function canCrawl(url, axiosInstance, userAgent) {
    const baseUrl = new URL(url).origin;
    const robotsUrl = new URL('/robots.txt', baseUrl).href;
    try {
        const response = await axiosInstance.get(robotsUrl);
        const robotsTxt = response.data;
        const robots = robotsParser(robotsUrl, robotsTxt);
        return robots.isAllowed(url, userAgent);
    } catch (err) {
        console.log(`Could not fetch robots.txt for ${baseUrl}, assuming allowed.`);
        return true;
    }
}
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
        console.log(`Checking robots.txt for: ${url}`);
        const allowed = await canCrawl(url, axiosInstance, userAgent);
        var proxies = []
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
            var newProxies = duplicateRemoval(proxies, './out/unsorted_proxies.txt');
            newProxies = duplicateRemoval(newProxies, './out/sorted_proxies.txt');
            writeProxies(newProxies, './out/unsorted_proxies.txt');
        }
        catch (err) {
            console.warn(`failed to write Scraped data ${url}: ${err.message}`);
        }
    }
}



async function main() {
    const sources = getSources('./sources.txt');
    const agent = 'Mozilla/5.0 (compatible; super-duper-octo-disco/1.0; +https://github.com/Relimer/super-duper-octo-disco)';
    const instance = createAxiosInstance(null, agent);
    await scrapeSources(instance, agent, sources);
}

main();
