export function checkPass(query: any) {
    const candidate = query?.pass;
    return candidate === `$777`;
}
