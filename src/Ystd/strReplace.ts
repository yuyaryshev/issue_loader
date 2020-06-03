export function strReplace(containerString: string, sourceString: string, targetString: string) {
    return containerString.split(sourceString).join(targetString);
}
