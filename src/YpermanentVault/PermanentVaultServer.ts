import WebSocket from "ws";
import { PermanentVault, PermanentVaultObjectVerificator } from "./PermanentVault";
import { Database } from "better-sqlite3";

export const pvDefaultPort: number = 8324;

export interface PermanentVaultServerAPIset {
    r: string;
    api: "set";
    vault: string;
    values: any[];
}

export interface PermanentVaultServerAPIremove {
    r: string;
    api: "remove";
    vault: string;
    values: string[];
}

export interface PermanentVaultServerAPIclear {
    r: string;
    api: "clear";
    vault: string;
    type: string;
}

export interface PermanentVaultServerAPIquery {
    r: string;
    api: "query";
    vault: string;
    type: string;
}

export type PermanentVaultServerAPI =
    | PermanentVaultServerAPIset
    | PermanentVaultServerAPIremove
    | PermanentVaultServerAPIclear
    | PermanentVaultServerAPIquery;

export class PermanentVaultServer {
    vaults: Map<string, PermanentVault<any>>;

    constructor(
        public readonly port = pvDefaultPort,
        public readonly vaultNames: string[],
        public readonly db: Database,
        public readonly vaultName: string,
        public readonly bulkSize: number = 16,
        public readonly verificator: PermanentVaultObjectVerificator<any> | undefined = undefined
    ) {
        const pthis = this;
        const wss = new WebSocket.Server({ port });
        this.vaults = new Map();
        for (let vault of vaultNames)
            this.vaults.set(vault, new PermanentVault<any>(db, vaultName, bulkSize, verificator));

        wss.on("connection", function connection(ws) {
            ws.on("message", function incoming(m: PermanentVaultServerAPI) {
                try {
                    const vault = pthis.vaults.get(m.vault);
                    if (!vault) throw new Error(`Unknown vault name '${m.vault}'`);
                    switch (m.api) {
                        case "set":
                            vault.set(m.values);
                            break;

                        case "remove":
                            vault.remove(m.values);
                            break;

                        case "clear":
                            vault.clear(m.type);
                            break;

                        case "query":
                            vault.query(m.type);
                            break;

                        default:
                            // @ts-ignore
                            throw new Error(`received unknown message: api=${m.api} ${JSON.stringify(m)}`);
                    }

                    ws.send({
                        r: m.r,
                        ok: true,
                    });
                } catch (e) {
                    ws.send({
                        r: m.r,
                        e: e.message + "\n" + e.stack,
                        ok: false,
                    });
                }
            });

            ws.send("something");
        });
    }
}

// export class RemotePermanentVault<T extends PermanentVaultObject> {
//     constructor(
//         public readonly remoteServer: string,
//         public readonly vaultName: string,
//         public readonly verificator: PermanentVaultObjectVerificator<T> | undefined = undefined
//     ) {
//         // TODO RemotePermanentVault
//     }

//     // TODO send request, check response

//     async set(object: T | T[]) {}

//     async remove(id: PermanentVaultId | T | PermanentVaultId[] | T[]) {}

//     async clear(type?: PermanentVaultType | undefined) {}

//     async query(type?: PermanentVaultType | undefined): Promise<T[]> {
//         // Тут надо observable по хорошему конечно. И функция должна называться map
//     }
// }
