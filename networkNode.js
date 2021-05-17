const Blockchain = require('./blockchain');
const bitcoin = new Blockchain;

const rp = require('request-promise');
const uuid = require('uuid/v4');
const nodeAddress = uuid().split('-').join('')
const express = require('express');
const { on } = require('nodemon');
const { json } = require('body-parser');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }))

app.get('/blockchain', (req, res) => {
    res.send(JSON.stringify(bitcoin));
})

app.post('/transaction', function(req, res) {
    const blockIndex = bitcoin.createNewTransaction(req.body.amount, req.body.sender, req.body.recipient);
    res.json({ note: `트랜젝션은 ${blockIndex}블락안으로 들어갈 예정입니다.` })
    console.log(blockIndex)
})
app.get('/mine', function(req, res) {
    const lastblock = bitcoin.getLastBlock()
    const previousBlockHash = lastblock['hash']
    const currentBlockData = {
        transactions: bitcoin.pendingTransaction,
        index: lastblock['index'] + 1
    }

    const nonce = bitcoin.proofOfWork(previousBlockHash, currentBlockData);
    const blockHash = bitcoin.hashBlock(previousBlockHash, currentBlockData, nonce);

    bitcoin.createNewTransaction(10, "bosang0000", nodeAddress)

    const newBlock = bitcoin.createNewBlock(nonce, previousBlockHash, blockHash)

    res.json({
        note: "새로운 블락이 성공적으로 만들어졌습니다",
        newBlock: newBlock
    })

})

app.post('/register-and-broadcast-node', function(req, res) {
    const newNodeUrl = req.body.newNodeUrl;

    if (bitcoin.networkNodes.indexOf(newNodeUrl) == -1) {
        bitcoin.networkNodes.push(newNodeUrl);
    }
    const regNodesPromises = [];
    bitcoin.networkNodes.forEach(networkNodes => {
        const requestOption = {
            uri: networkNodes + '/register-node',
            method: 'POST',
            body: { newNodeUrl: newNodeUrl },
            json: true
        };
        regNodesPromises.push(rp(requestOption))
    })
    Promise.all(regNodesPromises)
        .then(data => {
            const bulkRegisterOption = {
                uri: newNodeUrl + '/register-nodes-bulk',
                method: 'POST',
                body: { allNetworkNodes: [...bitcoin.networkNodes, bitcoin.currentNodeUrl] },
                json: true
            };
            return rp(bulkRegisterOption)
        }).then(data => {
            res.json({ note: "새로운 노드가 전체 네트워크에 성공적으로 등록이 되었습니다" })
        });
})
app.post('/register-node', function(req, res) {
    const newNodeUrl = req.body.newNodeUrl;
    const nodeNotAlreadyPresent = bitcoin.networkNodes.indexOf(newNodeUrl) == -1;
    const notCurrentNode = bitcoin.currentNodeUrl !== newNodeUrl;

    if (nodeNotAlreadyPresent && notCurrentNode) {
        bitcoin.networkNodes.push(newNodeUrl);
        res.json({ note: "새로운 노드가 등록되었습니다." })
    }
});
app.post('/register-nodes-bulk', function(req, res) {

})

const port = process.argv[2]

app.listen(port, () => {
    console.log('http://localhost:' + port)
})