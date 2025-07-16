import fs from 'fs';
import path from 'path';

function createFile(file) {
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(file)) {
        fs.writeFileSync(file, '');
    }
}

export function duplicateRemoval(proxies, file){
    const existingProxies = new Set();
    createFile(file)
    const fileData = fs.readFileSync(file, 'utf8').split('\n').map(line => line.trim()).filter(line => line.length > 0);
    fileData.forEach(proxy => existingProxies.add(proxy));
    proxies.forEach(proxy => existingProxies.add(proxy));
    return existingProxies;
}
export function writeProxies(proxies, file){
    createFile(file);
    fs.writeFileSync(file, [...proxies].join('\n') + '\n')
}