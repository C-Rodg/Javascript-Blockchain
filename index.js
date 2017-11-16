// Modules
const express = require("express");
const bodyParser = require("body-parser");
const WebSocket = require("ws");
const BlockApi = require("./blockchain/Block");

// Settings
const http_port = process.env.HTTP_PORT || 3001;
const p2p_port = process.env.P2P_PORT || 6001;
const initialPeers = process.env.PEERS ? process.env.PEERS.split(",") : [];

const initHttpServer = () => {
	const app = express();
	app.use(bodyParser.json());

	// Get blocks
	app.get("/blocks", (req, res) => res.send(JSON.stringify(blockchain)));

	// Mine a block
	app.post("/mineblock", (req, res) => {
		const newBlock = BlockApi.generateNextBlock(req.body.data);
		addBlock(newBlock);
		broadcast(responseLatestMsg());
		console.log(`block added: ${JSON.stringify(newBlock)}`);
		res.send();
	});

	// Get peers
	app.get("/peers", (req, res) => {
		res.send(
			sockets.map(s => `${s._socket.remoteAddress}:${s._socket.remotePort}`)
		);
	});

	// Add a peer
	app.post("/addPeer", (req, res) => {
		connectToPeers([req.body.peer]);
		res.send();
	});

	// Start http server
	app.listen(http_port, () =>
		console.log(`Listening http on port: ${http_port}`)
	);
};

// Replace chain if there are conflicts
const replaceChain = newBlocks => {
	if (
		BlockApi.isValidChain(newBlocks) &&
		newBlocks.length > blockchain.length
	) {
		console.log(
			"Received a valid blockchain. Replacing current with received blockchain."
		);
		blockchain = newBlocks;
		broadcast(responseLatestMsg());
	} else {
		console.log("Received an invalid blockchain.");
	}
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

// Add block to blockchain
const addBlock = newBlock => {
	if (BlockApi.isValidNewBlock(newBlock, getLatestBlock())) {
		blockchain.push(newBlock);
	}
};

// Get the latest block
const getLatestBlock = () => blockchain[blockchain.length - 1];

// Startup
let blockchain = [BlockApi.getGenesisBlock()];
