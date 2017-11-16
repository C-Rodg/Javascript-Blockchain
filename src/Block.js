class Block {
	constructor(index, previousHash, timestamp, data, hash) {
		this.index = index;
		this.previousHash = previousHash.toString();
		this.timestamp = timestamp;
		this.data = data;
		this.hash = hash.toString();
	}
}

// Calculate the block hash to keep integrity using SHA-256
const calculateHash = (index, previousHash, timestamp, data) => {
	return CryptoJS.SHA256(index + previousHash + timestamp + data).toString();
};

// Generate the next block object
const generateNextBlock = blockData => {
	const previousBlock = getLatestBlock();
	const nextIndex = previousBlock.index + 1;
	const nextTimestamp = new Date().getTime() / 1000;
	const nextHash = calculateHash(
		nextIndex,
		previousBlock.hash,
		nextTimestamp,
		blockData
	);
	return new Block(
		nextIndex,
		previousBlock.hash,
		nextTimestamp,
		blockData,
		nextHash
	);
};

// Get Genesis block (first block of blockchain)
const getGenesisBlock = () => {
	const timestamp = new Date().getTime() / 1000;
	const data = "GENESIS BLOCK";
	const thisHash = calculateHash(0, "0", timestamp, data);
	return new Block(0, "0", timestamp, data, thisHash);
};

// Create first block
const blockchain = [getGenesisBlock()];
