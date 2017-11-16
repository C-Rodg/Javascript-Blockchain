class Block {
	constructor(index, previousHash, timestamp, data, hash) {
		this.index = index;
		this.previousHash = previousHash.toString();
		this.timestamp = timestamp;
		this.data = data;
		this.hash = hash.toString();
	}
}

// Calculate hash for block structure
const calculateHashForBlock = block => {
	return calculateHash(
		block.index,
		block.previousHash,
		block.timestamp,
		block.data
	);
};

// Calculate the block hash to keep integrity using SHA-256
const calculateHash = (index, previousHash, timestamp, data) => {
	return CryptoJS.SHA256(index + previousHash + timestamp + data).toString();
};

// Get Genesis block (first block of blockchain)
const getGenesisBlock = () => {
	const timestamp = 1000;
	const data = "GENESIS BLOCK";
	const thisHash = calculateHash(0, "0", timestamp, data);
	return new Block(0, "0", timestamp, data, thisHash);
};

// Validate new block
const isValidNewBlock = (newBlock, previousBlock) => {
	if (previousBlock.index + 1 !== newBlock.index) {
		console.log("invalid index");
		return false;
	} else if (previousBlock.hash !== newBlock.previousHash) {
		console.log("invalid previousHash");
		return false;
	} else if (calculateHashForBlock(newBlock) !== newBlock.hash) {
		console.log(
			`invalid hash: ${calculateHashForBlock(newBlock)} ${newBlock.hash}`
		);
		return false;
	}
	return true;
};

// Validate blockchain
const isValidChain = blockchain => {
	if (JSON.stringify(blockchain[0]) !== JSON.stringify(getGenesisBlock())) {
		return false;
	}
	const tempBlocks = [blockchain[0]];
	for (let i = 0, j = blockchain.length; i < j; i++) {
		if (isValidNewBlock(blockchain[i], tempBlocks[i - 1])) {
			tempBlocks.push(blockchain[i]);
		} else {
			return false;
		}
	}
	return true;
};

module.exports.isValidChain = isValidChain;
module.exports.isValidNewBlock = isValidChain;
module.exports.getGenesisBlock = getGenesisBlock;
