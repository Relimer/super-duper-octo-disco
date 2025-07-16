import * as cheerio from 'cheerio';
import { duplicateRemoval, sleep, writeProxies, createAxiosInstanceHTTP, createAxiosInstanceSOCKS, canCrawl, getSources } from './util.js';
import fs from 'fs';
import pLimit from 'p-limit';

const limit = pLimit(2);

function is_valid_format(proxy){
  const regex = /^(http|https|socks4|socks5):\/\/((25[0-5]|2[0-4][0-9]|1?\d{1,2})\.){3}(25[0-5]|2[0-4][0-9]|1?\d{1,2}):([1-9][0-9]{0,4})$/;
  const match = proxy.match(regex);
  if (!match) return false;

  const port = parseInt(match[5], 10);
  return port >= 1 && port <= 65535;
}
function is_proxy_ssl_valid(proxy){

}
async function ipqualityscore_check(ip){
  const url = 'https://www.ipqualityscore.com/free-ip-lookup-proxy-vpn-test/lookup/' + ip;
  const agent = 'Mozilla/5.0 (compatible;)';
  const instance = createAxiosInstanceHTTP(null, agent);
  console.log(url);
  await sleep(Math.floor(Math.random() * 1000) + 2000);
  console.log(`Checking robots.txt for: ${url}`);
  const allowed = await canCrawl(url, instance, agent);
  if(!allowed) {
    console.warn(`Blocked by robots.txt: ${url}`)
  }
  else
  {
      console.log(`Scraping Source: ${url}`);
      try {
        const response = await instance.get(url);
        console.log(`Successfully Scraped: ${url}`);
        const $ = cheerio.load(response.data)
        return $('#lookup .grid-overlap.text-5xl.bold.text-center').text().trim();
      }
      catch (err) {
        console.warn(`Failed to scrape ${url}: ${err.message}`);
      }
  }
}
async function is_proxy_malicious(proxy){
  const ip = new URL(proxy).hostname;
  if(await ipqualityscore_check(ip) > 50)
  {
    return true;
  }

  //SSL checks
  //compare expected content, with retrieved content
  //Follow redirects, final URL matches initial URL
  //measure connection, reliability, timeouts, errors
  //cross check proxy against malicious lists

}

async function is_proxy_alive(proxy, timeout=5000){
  let instance;
  const agent = 'Mozilla/5.0 (compatible;)';
  const sources = getSources('./test-sources.txt');
  const url = sources[Math.floor(Math.random() * sources.length)];
  await sleep(Math.floor(Math.random() * 1000) + 2000);
  if (proxy.startsWith('http://'))
  {
    instance = createAxiosInstanceHTTP(proxy, agent);
  }
  else if(proxy.startsWith('socks4://'))
  {
    instance = createAxiosInstanceSOCKS(proxy, agent);
  }
  try {
    const response = await instance.head(url, {
      proxy: false,
      timeout,
    });

    if (response.status >= 200 && response.status < 400) {
      console.log(`Proxy ${proxy} is alive.`);
      return true;
    } else {
      console.warn(`Proxy ${proxy} responded with status ${response.status}`);
      return false;
    }
  } catch (error) {
    console.warn(`Proxy ${proxy} failed: ${error.message}`);
    return false;
  }
}
function is_proxy_anonymous(proxy){

}
function does_proxy_support_https(proxy){

}
function get_proxy_response_time(proxy){

}
function is_proxy_reliable(proxy, retries=3){

}

function get_proxy_geolocation(proxy){

}
function get_proxy_isp(proxy){

}

export async function validate_proxies(file){
  const fileData = fs.readFileSync(file, 'utf8').split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const proxies = new Set();
  let blacklistFormat = new Set();
  let blacklistDead = new Set();
  let blacklistMalicious = new Set();
  const tasks = fileData.map(proxy => limit(async () => {
    console.log(`Validating Proxy: ${proxy}`);
    if(!is_valid_format(proxy)) {
      console.warn(`Invalid format: ${proxy}`)
      return { format: proxy };
    }
    if(!is_proxy_alive(proxy)){
      console.warn(`Proxy not Alive: ${proxy}`)
      return { dead: proxy };
    }
    //if(await is_proxy_malicious(proxy)) {
      //console.warn(`Malicious proxy: ${proxy}`)
      //return { malicious: proxy };
    //}
    console.log(`Valid proxy: ${proxy}`);
    return { valid: proxy };
  }));
  const results = await Promise.all(tasks);
  results.forEach( result => {
    if(!result) return;
    if(result.format) blacklistFormat.add(result.format);
    if(result.malicious) blacklistMalicious.add(result.malicious);
    if(result.dead) blacklistDead.add(result.dead);
    if(result.valid) proxies.add(result.valid);
  })
  blacklistFormat = duplicateRemoval(blacklistFormat, './out/blacklist/blacklist-format.txt')
  writeProxies(blacklistFormat, './out/blacklist/blacklist-format.txt');
  
  console.log(blacklistDead);
  blacklistDead = duplicateRemoval(blacklistDead, './out/blacklist/blacklist-dead.txt')
  writeProxies(blacklistDead, './out/blacklist/blacklist-dead.txt');
  
  blacklistMalicious = duplicateRemoval(blacklistMalicious, './out/blacklist/blacklist-malicious.txt')
  writeProxies(blacklistMalicious, './out/blacklist/blacklist-malicious.txt');

  writeProxies(proxies, file);
}