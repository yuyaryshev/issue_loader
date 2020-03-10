export async function waitAll(...promises: Promise<any>[]) {
    for (let promise of promises) await promise;
}
