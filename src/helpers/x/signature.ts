// Converts an eip712 signature to an array of three felts (string represented). We use strings and not BigInt they will be serialized to json format anyway.
export function eip712ToFelts(signature: string): Array<string> {
    if (signature.startsWith("0x")) {
        // Remove "0x" prefix
        signature = signature.slice(2)
    }

    // Make sure it's just the correct size
    if (signature.length != 130) {
        return []
    }

    // First 31 bytes
    const part1 = BigInt("0x" + signature.slice(0, 31 * 2)).toString().slice(0, -1);
    // Bytes 31 - 62
    const part2 = BigInt("0x" + signature.slice(31 * 2, 62 * 2)).toString().slice(0, -1);
    // Last 3 bytes
    const part3 = BigInt("0x" + signature.slice(62 * 2)).toString().slice(0, -1);
    return [part1, part2, part3]
}