import axios from 'axios';
import HttpsProxyAgent from 'https-proxy-agent'
import SocksProxyAgent from 'socks-proxy-agent'
import { duplicateRemoval, writeProxies } from './write_output.js';
import fs from 'fs';

function is_valid_format(proxy){
  const regex = /^(http|https|socks4|socks5):\/\/((25[0-5]|2[0-4][0-9]|1?\d{1,2})\.){3}(25[0-5]|2[0-4][0-9]|1?\d{1,2}):([1-9][0-9]{0,4})$/;
  const match = proxy.match(regex);
  if (!match) return false;

  const port = parseInt(match[5], 10);
  return port >= 1 && port <= 65535;
}
function is_proxy_alive(proxy, timeout=5){

}
function is_proxy_anonymous(proxy){

}
function does_proxy_support_https(proxy){

}
function is_proxy_ssl_valid(proxy){

}
function get_proxy_response_time(proxy){

}
function is_proxy_reliable(proxy, retries=3){

}
function is_proxy_malicious(proxy){

}
function get_proxy_geolocation(proxy){

}
function get_proxy_isp(proxy){

}
function is_valid(proxy){
  if(is_valid_format(proxy))
  {
    return true;
  }
}

export async function validate_proxy(file){
  const fileData = fs.readFileSync(file, 'utf8').split('\n').map(line => line.trim()).filter(line => line.length > 0);
  fileData.forEach(proxy => {
    console.log(`Validating Proxy: ${proxy}`)
    if(is_valid(proxy)) {
      duplicateRemoval('./out/blacklist.txt')
      writeProxies(proxy, './out/blacklist.txt');
    }
  });
}
if(process.env.NODE_ENV==='unsorted'){
  validate_proxy('./out/unsorted_proxies.txt')
}