const key = "".trim();
const nn = "".trim();

const { createCipher, createDecipher } = require("crypto");
const { writeFileSync, readFileSync } = require("fs");
const algorithm = "aes256";
const inputEncoding = "utf8";
const outputEncoding = "hex";

let enc = s => {
    const cipher = createCipher(algorithm, key);
    let ciphered = cipher.update(s, inputEncoding, outputEncoding);
    ciphered += cipher.final(outputEncoding);
    return ciphered;
};
let dec = s => {
    const decipher = createDecipher(algorithm, key);
    let deciphered = decipher.update(s, outputEncoding, inputEncoding);
    deciphered += decipher.final(inputEncoding);
    return deciphered;
};

try {
    writeFileSync("s.dat", enc(readFileSync("s.tsv", "utf-8")), "utf-8");
} catch (e) {}

let cnt = 0;
const mc = 10;
if (nn.trim().length > 0 && key.trim().length > 0)
    dec(readFileSync("s.dat", "utf-8"))
        .split("\n")
        .map(line => {
            const a = line.split("\t");
            const r = {
                n: a[2],
                s: (a[1] && Math.round((a[1].split(",")[0] * 2) / 1000)) || 0
            };

            let b = true;
            if (r.n) {
                nn.split(" ").map(
                    x => (b = b && r.n.toUpperCase().includes(x.toUpperCase()))
                );
                if (b) {
                    if (++cnt < mc) console.log(r.n, r.s);
                    else {
                        console.log(`${mc}+`);
                        process.exit(0);
                        return;
                    }
                }
            }
        });
