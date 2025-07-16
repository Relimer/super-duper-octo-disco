import fs from 'fs';
import path from 'path';
import robotsParser from 'robots-parser';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import axios from 'axios';

function createFile(file) {
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(file)) {
        fs.writeFileSync(file, '');
    }
}
export function readProxies(file) {
  if (!fs.existsSync(file)) return new Set();
  return new Set(
    fs.readFileSync(file, 'utf8')
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
  );
}
export function filterProxies(proxies, file) {
    let currentProxies = readProxies(file);
    return new Set([...proxies].filter(p => !currentProxies.has(p)));
}
export function duplicateRemoval(proxies, file){
    const existingProxies = new Set();
    createFile(file)
    const fileData = readProxies(file);
    fileData.forEach(proxy => existingProxies.add(proxy));
    proxies.forEach(proxy => existingProxies.add(proxy));
    return existingProxies;
}
export function writeProxies(proxies, file){
    createFile(file)
    fs.writeFileSync(file + '.tmp', [...proxies].join('\n') + '\n');
    fs.renameSync(file + '.tmp', file);
}
export function getSources(sourceFile){
    const sources = fs.readFileSync(sourceFile, 'utf8')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
    console.log(`Found Sources: ${sources}`);
    return sources;
}
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function canCrawl(url, axiosInstance, userAgent) {
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
export function createAxiosInstanceHTTP(proxyURL, userAgent){
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
export function createAxiosInstanceSOCKS(proxyURL, userAgent){
    const headers = { 'User-Agent': userAgent, 
                        'Accept-Language': 'en-US,en;q=0.9', 
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8', 
                        'Connection': 'keep-alive', 
                    }
    if(proxyURL){
        console.log(`Using Proxy: ${proxyURL}`);
        const agent = new SocksProxyAgent(proxyURL);
        return axios.create({ httpAgent: agent, httpsAgent: agent, headers, timeout:5000, proxy: false, });
    }
    else {
        console.warn('No Proxy Used.');
        return axios.create({ headers, timeout:5000, });
    }
}