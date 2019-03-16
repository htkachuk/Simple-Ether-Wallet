const bodyParser = require('body-parser');
const path = require('path')
const express = require('express')

const Tx = require('ethereumjs-tx');
const axios = require('axios')
const log = require('ololog').configure({ time: true })
const ansi = require('ansicolor').nice

let m = 0
const exphbs = require('express-handlebars')
const app = express()
const port = 3000
const Web3 = require('web3')
let curtWallet = [];
// let session;

//For parsing input data from web page
app.use(bodyParser.urlencoded( {
    extended: true
}));
app.use( bodyParser.json() );

app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'pug');


app.get('/currentWallet', (request, response) => {
	if (m == 0) {
		response.render('login')
	}
	web3 = getRopstenWeb3()
	let balance = 0
	web3.eth.getBalance(curtWallet[0].address)
	.then(res => {
		curtWallet[0].balance = web3.utils.toWei(res, "ether")
		response.render('currentWallet', {account: curtWallet[0].account, privateKey: curtWallet[0].privateKey, address: curtWallet[0].address, balance: curtWallet[0].balance})
	})
})

app.post('/loadWallet', (request, response) => {
	let web3 = getRopstenWeb3()
	let address = request.body.address
	let balance = 0
	web3.eth.getBalance(address)
	.then(res => {
		m = 1
		curtWallet.push({
			account: request.body.account,
			password: request.body.password,
			privateKey: request.body.privateKey,
			address: request.body.address,
			balance: web3.utils.toWei(res, "ether")
		})
		response.send({account: curtWallet[0].account, privateKey: curtWallet[0].privateKey, address: curtWallet[0].address, balance: curtWallet[0].balance})
	});
})

app.get('/invalidPassword', (request, response) => {
	response.render('invalidPassword')
})

//Creating new keys and addresses
app.get('/createKey', (request, response) => {
	const web3 = getRopstenWeb3()
	let info = web3.eth.accounts.create()
	response.render('createKey', {address: info.address, privateKey: info.privateKey})
})

app.get('/createWallet', (request, response) => {
	response.render('createWallet')
})

app.post('/addAcount', (request, response) => {
	let account = request.body.account
	let password = request.body.password
	const web3 = getRopstenWeb3()
	let info = web3.eth.accounts.wallet.create(1);
	console.log(info.accounts['0'])
	response.render('saveWallet', {address: info.accounts['0'].address, privateKey: info.accounts['0'].privateKey, account: account, password: password})
})

app.post('/send', (request, response) => {
	if (m == 0) {
		response.render('login')
		return
	}
	const web3 = getRopstenWeb3()
	const getCurrentGasPrices = async () => {
		let response = await axios.get('https://ethgasstation.info/json/ethgasAPI.json')
		let prices = {
			low: response.data.safeLow / 10,
			medium: response.data.average / 10,
			high: response.data.fast / 10
		}
		return prices
	}
	let result
	web3.eth.defaultAccount = curtWallet[0].address
	let nonce = web3.eth.getTransactionCount(web3.eth.defaultAccount)
	nonce.then(function(res) {
		nonce = res
		let gasPricesWait = getCurrentGasPrices()
		let gasPrices
		gasPricesWait.then(function(result) {
			gasPrices = result
			let rawTx = {
				"to": request.body.to,
				"value": web3.utils.toHex(web3.utils.toWei(request.body.val, "ether")),
				"gas": 210000,
				"gasPrice": gasPrices.low * 1000000000,
				"nonce": nonce,
				"chainId": 3
			}
			const transaction = new Tx(rawTx)
			console.log(rawTx)
			transaction.sign(Buffer.from(curtWallet[0].privateKey.substring(2), 'hex'))
			const serializedTx = transaction.serialize()
			console.log(serializedTx.toString('hex'));
			const transactionId = web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex'))
			transactionId.then(function(result) {
				response.render('index')
			})
		})
	})
response.render('index')
})

app.get('/send', (request, response) => {
	response.render('send')
})

app.get('/login', (request, response) => {
	response.render('login')
})

app.post('/login', (request, response) => {
	let pas = request.body.password
	let ac = request.body.account
	response.render('arguments', {account: ac, password: pas})
})

//Called from layout
app.get('/importKey', (request, response) => {
	response.render('importKey')
})

app.get('/importWallet', (request, response) => {
	response.render('importWallet')
})

app.post('/importWallet', (request, response) => {
	let privateKey = request.body.privateKey
	let login = request.body.login
	let pass = request.body.password
	let info

	const web3 = getRopstenWeb3()
	try {
		info = web3.eth.accounts.privateKeyToAccount(privateKey)
	}
	catch(e){
		response.render('error')
	}
	console.log()
	response.render('saveWallet', {address: info.address, privateKey: info.privateKey, account: login, password: pass})
})

//Importing valid private key called from importKey
app.post('/importKey', (request, response) => {
	let privateKey = request.body.key
	const web3 = getRopstenWeb3()
	let info 
	try{
		info = web3.eth.accounts.privateKeyToAccount(privateKey)
	}
	catch(e){
		response.render('error')
	}
	response.render('createKey', {address: info.address, privateKey: info.privateKey})
})

//Check balance from addr
app.post('/balance', (request, response) => {
	let address = request.body.address
	const web3 = getRopstenWeb3()
	let balance = 0
	web3.eth.getBalance(address)
	.then(res => {
		response.render("balance", {
			balance: web3.utils.toWei(res, "ether"), 
			address: address
		});
	});
});

//Run a server
app.listen(port, (err) => {
    if (err) {
        return console.log('something bad happened', err)
    }
    console.log(`server is listening on ${port}`)
})

app.get('/', (request, response) => {
    response.render('index')
})


function getRopstenWeb3() {
	const rpcURL = "https://ropsten.infura.io/v3/26502772b31d49f6a259443fc14019f0"
	const web3 = new Web3(new Web3.providers.HttpProvider(rpcURL))
	console.log(web3.version)
	return web3;
}

