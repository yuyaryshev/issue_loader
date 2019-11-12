import { YMutex } from './ymutex';
export type YMutex = {
    promise?: Promise<void>;
    lock: <T>(asyncCallback: () => Promise<T>)=> Promise<T>;
};
export function ymutex(): YMutex {
    let m = {
        lock: async function(asyncCallback: () => Promise<any>) {
            let presolve: any, preject: any;
            while(m.promise) 
                await m.promise;
        
            m.promise = new Promise((resolve:any, reject:any) => {
                presolve = resolve;
            });
                
            try {
                let r = await asyncCallback();
                delete m.promise;
                presolve();
                return r;
            } catch(e) {
                delete m.promise;
                presolve();
                throw e;
            }                delete m.promise;
        }        
    } as YMutex;    
    return m;
}

