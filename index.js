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

// Initialize P2P server
const initP2PServer = () => {
	const server = new WebSocket.server({ port: p2p_port });
	server.on("connection", ws => initConnection(ws));
	console.log(`Listening websocket p2p on port: ${p2p_port}`);
};

// Initialize a websocket a connection
const initConnection = ws => {
	sockets.push(ws);
	initMessageHandler(ws);
	initErrorHandler(ws);
	write(ws, queryChainLengthMsg());
};

// Handle messages from websocket
const initMessageHandler = ws => {
	ws.on("message", data => {
		const message = JSON.parse(data);
		console.log(`Received message: ${JSON.stringify(message)}`);
		switch (message.type) {
			case MessageType.QUERY_LATEST:
				write(ws, responseLatestMsg());
				break;
			case MessageType.QUERY_ALL:
				write(ws, responseChainMsg());
				break;
			case MessageType.RESPONSE_BLOCKCHAIN:
				handleBlockchainResponse(message);
				break;
		}
	});
};

// Handle initialization websocket error
const initErrorHandler = ws => {
	const closeConnection = ws => {
		console.log(`Connection failed to peer: ${ws.url}`);
		sockets.splice(sockets.indexOf(ws), 1);
	};
	ws.on("close", () => closeConnection(ws));
	ws.on("error", () => closeConnection(ws));
};

// Connect to peers
const connectToPeers = newPeers => {
	newPeers.forEach(peer => {
		const ws = new WebSocket(peer);
		ws.on("open", () => initConnection(ws));
		ws.on("error", () => console.log("connection failed"));
	});
};

// Handle a blockchain response
const handleBlockchainResponse = message => {
	const receivedBlocks = JSON.parse(message.data).sort(
		(b1, b2) => b1.index - b2.index
	);
	const latestBlockReceived = receivedBlocks[receivedBlocks.length - 1];
	const latestBlockHeld = getLatestBlock();
	if (latestBlockReceived.index > latestBlockHeld.index) {
		console.log(
			`Blockchain is possibly behind.  We got: ${latestBlockHeld.index} Peer got: ${latestBlockReceived.index}`
		);
		if (latestBlockHeld.hash === latestBlockReceived.previousHash) {
			console.log("We can append the received block to our chain.");
			blockchain.push(latestBlockReceived);
			broadcast(responseLatestMsg());
		} else if (receivedBlocks.length === 1) {
			console.log("We have to query the chain from our peer.");
			broadcast(queryAllMsg());
		} else {
			console.log("Received blockchain is longer than the current blockchain.");
			replaceChain(receivedBlocks);
		}
	} else {
		console.log(
			"Received blockchain is not longer than current blockchain. Do nothing."
		);
	}
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
