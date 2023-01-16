const utils = require('./utils');
const BN = require('bn.js');
const secp256k1 = require('secp256k1');
const keccak256 = require('keccak256');
const Web3 = require('web3');
const web3js = new Web3(Web3.givenProvider);
const assert = require('assert');
const { util } = require('config');

const CHAIN_ID = 0;
const CHAIN_ID_OTHER = 1;
const ONE_TOKEN = '1000000000000000000';
const TEN_TOKEN = '10000000000000000000';
const HUNDRED_TOKEN = '100000000000000000000';
const TOKEN_ID = 'skywalker';
const COOL_DOWN = 2;

const TRANSFER = 0;
const MINT = 1;
const BURN = 2;
const DEPOSIT = 3;
const WITHDRAW = 4;

const Fungible = artifacts.require('./MockFungible.sol');
const OmniverseProtocol = artifacts.require('./OmniverseProtocol.sol');
Fungible.defaults({
    gas: 8000000,
});

Fungible.numberFormat = 'String';

const owner = '0xe092b1fa25DF5786D151246E492Eed3d15EA4dAA';
const user1 = '0xc0d8F541Ab8B71F20c10261818F2F401e8194049';
const user2 = '0xf1F8Ef6b4D4Ba31079E2263eC85c03fD5a0802bF';
const committee = '0xc91579bB7972f76D595f8665BffaF92874C8084C';

const ownerPk = '0xb0c4ae6f28a5579cbeddbf40b2209a5296baf7a4dc818f909e801729ecb5e663dce22598685e985a6ed1a557cf2145deba5290418b3cc00680a90accc9b93522';
const user1Pk = '0x99f5789b8b0d903a6e868c5fb9971eedde37da046e69d49c903a1b33167e0f76d1f1269628bfcff54e0581a0b019502394754e900dcbb69bf30010d51967d780';
const user2Pk = '0x25607735c05d91b504425c25567154aea2fd07e9a515b7872c7f783aa58333942b9d6ac3afacdccfe2585d1a4617f23a802a32bb6abafe13aaba2d386d44f52d';
const committeePk = '0x8bb25caae0a466afde04833610cf0c998050693974188853bdb982ed60e5e08ee71b3c9c0f900f8191512787e47908277272f71f991cb15fa364bad8018ef40b';

const ownerSk = Buffer.from('0cc0c2de7e8c30525b4ca3b9e0b9703fb29569060d403261055481df7014f7fa', 'hex');
const user1Sk = Buffer.from('b97de1848f97378ee439b37e776ffe11a2fff415b2f93dc240b2d16e9c184ba9', 'hex');
const user2Sk = Buffer.from('42f3b9b31fcaaa03ca71cab7d194979d0d1bedf16f8f4e9414f0ed4df699dd10', 'hex');
const committeeSk = Buffer.from('41219e3efe938f4b1b5bd68389705be763821460b940d5e2bd221f66f40028d3', 'hex');

let signData = (hash, sk) => {
    let signature = secp256k1.ecdsaSign(Uint8Array.from(hash), Uint8Array.from(sk));
    return '0x' + Buffer.from(signature.signature).toString('hex') + (signature.recid == 0 ? '1b' : '1c');
}

let getRawData = (txData) => {
    let ret = Buffer.concat([Buffer.from(new BN(txData.nonce).toString('hex').padStart(32, '0'), 'hex'), Buffer.from(new BN(txData.chainId).toString('hex').padStart(8, '0'), 'hex'),
    Buffer.from(txData.initiator.slice(2), 'hex'), Buffer.from(txData.from.slice(2), 'hex'), Buffer.from(new BN(txData.op).toString('hex').padStart(2, '0'), 'hex'),
    Buffer.from(txData.data.slice(2), 'hex'), Buffer.from(new BN(txData.amount).toString('hex').padStart(32, '0'), 'hex')]);
    return ret;
}

let encodeMint = (from, toPk, amount, nonce) => {
    let txData = {
        nonce: nonce,
        chainId: CHAIN_ID,
        initiator: Fungible.address,
        from: from.pk,
        op: MINT,
        data: toPk,
        amount: amount,
    }
    let bData = getRawData(txData);
    let hash = keccak256(bData);
    txData.signature = signData(hash, from.sk);
    return txData;
}

let encodeTransfer = (from, toPk, amount, nonce) => {
    let txData = {
        nonce: nonce,
        chainId: CHAIN_ID,
        initiator: Fungible.address,
        from: from.pk,
        op: TRANSFER,
        data: toPk,
        amount: amount,
    }
    let bData = getRawData(txData);
    let hash = keccak256(bData);
    txData.signature = signData(hash, from.sk);
    return txData;
}

let encodeWithdraw = (from, amount, nonce, chainId) => {
    let txData = {
        nonce: nonce,
        chainId: chainId ? chainId : CHAIN_ID,
        initiator: Fungible.address,
        from: from.pk,
        op: WITHDRAW,
        data: '0x',
        amount: amount,
    }
    let bData = getRawData(txData);
    let hash = keccak256(bData);
    txData.signature = signData(hash, from.sk);
    return txData;
}

let encodeDeposit = (from, toPk, amount, nonce, chainId) => {
    let txData = {
        nonce: nonce,
        chainId: chainId ? chainId : CHAIN_ID,
        initiator: Fungible.address,
        from: from.pk,
        op: DEPOSIT,
        data: toPk,
        amount: amount,
    }
    let bData = getRawData(txData);
    let hash = keccak256(bData);
    txData.signature = signData(hash, from.sk);
    return txData;
}
    
contract('SkywalkerFungible', function() {
    before(async function() {
        await initContract();
    });

    let fungible;

    let initContract = async function() {
        let protocol = await OmniverseProtocol.new();
        Fungible.link(protocol);
        fungible = await Fungible.new(CHAIN_ID, TOKEN_ID, TOKEN_ID, {from: owner});
        Fungible.address = fungible.address;
        await fungible.setMembers([[CHAIN_ID, Fungible.address]]);
        await fungible.setCooingDownTime(COOL_DOWN);
        await fungible.setCommitteeAddress(committeePk);
    }

    const mintToken = async function(from, toPk, amount) {
        let nonce = await fungible.getTransactionCount(from.pk);
        let txData = encodeMint(from, toPk, amount, nonce);
        await fungible.sendOmniverseTransaction(txData);
        await utils.sleep(COOL_DOWN);
        await utils.evmMine(1);
        let ret = await fungible.triggerExecution();
    }
    
    describe('Verify transaction', function() {
        before(async function() {
            await initContract();
        });

        describe('Signature error', function() {
            it('should fail', async () => {
                let nonce = await fungible.getTransactionCount(user1Pk);
                let txData = encodeTransfer({pk: user1Pk, sk: user1Sk}, user2Pk, TEN_TOKEN, nonce);
                txData.signature = txData.signature.slice(0, -2);
                await utils.expectThrow(fungible.sendOmniverseTransaction(txData), 'Verify failed');
            });
        });

        describe('Sender not signer', function() {
            it('should fail', async () => {
                let nonce = await fungible.getTransactionCount(user1Pk);
                let txData = encodeTransfer({pk: user1Pk, sk: user1Sk}, user2Pk, TEN_TOKEN, nonce);
                txData.from = ownerPk;
                await utils.expectThrow(fungible.sendOmniverseTransaction(txData), 'Signer not sender');
            });
        });

        describe('Nonce error', function() {
            it('should fail', async () => {
                let nonce = await fungible.getTransactionCount(user1Pk) + 20;
                let txData = encodeTransfer({pk: user1Pk, sk: user1Sk}, user2Pk, TEN_TOKEN, nonce);
                await utils.expectThrow(fungible.sendOmniverseTransaction(txData), 'Nonce error');
            });
        });

        describe('All conditions satisfied', function() {
            it('should succeed', async () => {
                let nonce = await fungible.getTransactionCount(ownerPk);
                let txData = encodeMint({pk: ownerPk, sk: ownerSk}, user2Pk, TEN_TOKEN, nonce);
                let ret = await fungible.sendOmniverseTransaction(txData);
                let count = await fungible.getTransactionCount(ownerPk);
                assert(count == 0, "The count should be zero");
                await utils.sleep(COOL_DOWN);
                await utils.evmMine(1);
                ret = await fungible.triggerExecution();
                count = await fungible.getTransactionCount(ownerPk);
                assert(count == 1, "The count should be one");
                assert(ret.logs[0].event == 'TransactionSent');
            });
        });

        describe('Cooling down', function() {
            it('should fail', async () => {
                let nonce = await fungible.getTransactionCount(ownerPk);
                let txData = encodeMint({pk: ownerPk, sk: ownerSk}, user2Pk, TEN_TOKEN, nonce);
                await fungible.sendOmniverseTransaction(txData);
                await utils.expectThrow(fungible.sendOmniverseTransaction(txData), 'Transaction cached');
            });
        });

        describe('Transaction duplicated', function() {
            it('should fail', async () => {
                let nonce = await fungible.getTransactionCount(ownerPk) - 1;
                let txData = encodeMint({pk: ownerPk, sk: ownerSk}, user2Pk, TEN_TOKEN, nonce);
                await utils.expectThrow(fungible.sendOmniverseTransaction(txData), 'Duplicated');
            });
        });

        describe('Cooled down', function() {
            it('should succeed', async () => {
                await utils.sleep(COOL_DOWN);
                await utils.evmMine(1);
                let nonce = await fungible.getTransactionCount(ownerPk);
                await utils.sleep(COOL_DOWN);
                await utils.evmMine(1);
                ret = await fungible.triggerExecution();
                let count = await fungible.getTransactionCount(ownerPk);
                assert(count == 2);
                assert(ret.logs[0].event == 'TransactionSent');
            });
        });

        describe('Malicious', function() {
            it('should fail', async () => {
                let nonce = await fungible.getTransactionCount(ownerPk) - 1;
                let txData = encodeMint({pk: ownerPk, sk: ownerSk}, user1Pk, TEN_TOKEN, nonce);
                await fungible.sendOmniverseTransaction(txData);
                let malicious = await fungible.isMalicious(ownerPk);
                assert(malicious, "It should be malicious");
            });
        });
    });
    
    describe('Omniverse Transaction', function() {
        before(async function() {
            await initContract();
        });
    
        describe('Wrong initiator', function() {
            it('should fail', async () => {
                let nonce = await fungible.getTransactionCount(user1Pk);
                let txData = encodeTransfer({pk: user1Pk, sk: user1Sk}, user2Pk, TEN_TOKEN, nonce);
                txData.initiator = user1;
                await utils.expectThrow(fungible.sendOmniverseTransaction(txData), 'Wrong initiator');
            });
        });
    
        describe('All conditions satisfied', function() {
            it('should succeed', async () => {
                let nonce = await fungible.getTransactionCount(ownerPk);
                let txData = encodeMint({pk: ownerPk, sk: ownerSk}, user2Pk, TEN_TOKEN, nonce);
                await fungible.sendOmniverseTransaction(txData);
                let count = await fungible.getDelayedTxCount();
                assert(count == 1, 'The number of delayed txs should be one');
                await utils.sleep(COOL_DOWN);
                await utils.evmMine(1);
                ret = await fungible.triggerExecution();
            });
        });
    
        describe('Malicious transaction', function() {
            it('should fail', async () => {
                let nonce = await fungible.getTransactionCount(ownerPk) - 1;
                let txData = encodeMint({pk: ownerPk, sk: ownerSk}, user1Pk, TEN_TOKEN, nonce);
                await fungible.sendOmniverseTransaction(txData);
                let count = await fungible.getDelayedTxCount();
                assert(count == 0, 'The number of delayed txs should be zero');
            });
        });
    
        describe('User is malicious', function() {
            it('should fail', async () => {
                let nonce = await fungible.getTransactionCount(ownerPk);
                let txData = encodeMint({pk: ownerPk, sk: ownerSk}, user2Pk, TEN_TOKEN, nonce);
                await utils.expectThrow(fungible.sendOmniverseTransaction(txData), 'User malicious');
            });
        });
    });
    
    describe('Get executable delayed transaction', function() {
        before(async function() {
            await initContract();
            let nonce = await fungible.getTransactionCount(ownerPk);
            let txData = encodeMint({pk: ownerPk, sk: ownerSk}, user2Pk, TEN_TOKEN, nonce);
            await fungible.sendOmniverseTransaction(txData);
        });

        describe('Cooling down', function() {
            it('should be none', async () => {
                let tx = await fungible.getExecutableDelayedTx();
                assert(tx.sender == '0x', 'There should be no transaction');
            });
        });

        describe('Cooled down', function() {
            it('should be one transaction', async () => {
                await utils.sleep(COOL_DOWN);
                await utils.evmMine(1);
                let tx = await fungible.getExecutableDelayedTx();
                assert(tx.sender == ownerPk, 'There should be one transaction');
            });
        });
    });
    
    describe('Trigger execution', function() {
        before(async function() {
            await initContract();
        });

        describe('No delayed transaction', function() {
            it('should fail', async () => {
                await utils.expectThrow(fungible.triggerExecution(), 'No delayed tx');
            });
        });

        describe('Not executable', function() {
            it('should fail', async () => {
                let nonce = await fungible.getTransactionCount(ownerPk);
                let txData = encodeMint({pk: ownerPk, sk: ownerSk}, user2Pk, TEN_TOKEN, nonce);
                await fungible.sendOmniverseTransaction(txData);
                await utils.expectThrow(fungible.triggerExecution(), 'Not executable');
            });
        });
    });
    
    describe('Mint', function() {
        before(async function() {
            await initContract();
        });

        describe('Not owner', function() {
            it('should fail', async () => {
                let nonce = await fungible.getTransactionCount(user1Pk);
                let txData = encodeMint({pk: user2Pk, sk: user2Sk}, user1Pk, ONE_TOKEN, nonce);
                await utils.expectThrow(fungible.sendOmniverseTransaction(txData), "Not owner");
            });
        });

        describe('Is owner', function() {
            it('should succeed', async () => {
                let nonce = await fungible.getTransactionCount(ownerPk);
                let txData = encodeMint({pk: ownerPk, sk: ownerSk}, user1Pk, ONE_TOKEN, nonce);
                await fungible.sendOmniverseTransaction(txData);
                await utils.sleep(COOL_DOWN);
                await utils.evmMine(1);
                let ret = await fungible.triggerExecution();
                let o = await fungible.owner();
                assert(ret.logs[1].event == 'OmniverseTokenTransfer');
                let balance = await fungible.omniverseBalanceOf(user1Pk);
                assert(ONE_TOKEN == balance, 'Balance should be one');
            });
        });
    });
    
    describe('Transfer', function() {
        before(async function() {
            await initContract();
            await mintToken({pk: ownerPk, sk: ownerSk}, user1Pk, ONE_TOKEN);
        });

        describe('Exceed balance', function() {
            it('should fail', async () => {
                let nonce = await fungible.getTransactionCount(user1Pk);
                let txData = encodeTransfer({pk: user1Pk, sk: user1Sk}, user2Pk, TEN_TOKEN, nonce);
                await utils.expectThrow(fungible.sendOmniverseTransaction(txData), 'Exceed Balance');
            });
        });

        describe('Balance enough', function() {
            it('should succeed', async () => {
                let nonce = await fungible.getTransactionCount(user1Pk);
                let txData = encodeTransfer({pk: user1Pk, sk: user1Sk}, user2Pk, ONE_TOKEN, nonce);
                await fungible.sendOmniverseTransaction(txData);
                await utils.sleep(COOL_DOWN);
                await utils.evmMine(1);
                let ret = await fungible.triggerExecution();
                assert(ret.logs[1].event == 'OmniverseTokenTransfer');
                let balance = await fungible.omniverseBalanceOf(user1Pk);
                assert('0' == balance, 'Balance should be zero');
                balance = await fungible.omniverseBalanceOf(user2Pk);
                assert(ONE_TOKEN == balance, 'Balance should be one');
            });
        });
    });
    
    describe('Withdraw', function() {
        before(async function() {
            await initContract();
            await mintToken({pk: ownerPk, sk: ownerSk}, user1Pk, ONE_TOKEN);
        });

        describe('Exceed balance', function() {
            it('should fail', async () => {
                let nonce = await fungible.getTransactionCount(user1Pk);
                let txData = encodeWithdraw({pk: user1Pk, sk: user1Sk}, TEN_TOKEN, nonce);
                await utils.expectThrow(fungible.sendOmniverseTransaction(txData), 'Exceed Balance');
            });
        });

        describe('Balance enough', function() {
            it('should succeed', async () => {
                let nonce = await fungible.getTransactionCount(user1Pk);
                let txData = encodeWithdraw({pk: user1Pk, sk: user1Sk}, ONE_TOKEN, nonce);
                await fungible.sendOmniverseTransaction(txData);
                await utils.sleep(COOL_DOWN);
                await utils.evmMine(1);
                let ret = await fungible.triggerExecution();
                assert(ret.logs[1].event == 'OmniverseTokenWithdraw');
                let balance = await fungible.omniverseBalanceOf(user1Pk);
                assert('0' == balance, 'Balance should be zero');
                balance = await fungible.nativeBalanceOf(user1);
                assert(ONE_TOKEN == balance, 'Balance should be one');
            });
        });

        describe('Message received from other chain', function() {
            before(async function() {
                await initContract();
                await fungible.setMembers([[CHAIN_ID, Fungible.address], [CHAIN_ID_OTHER, Fungible.address]]);
                await mintToken({pk: ownerPk, sk: ownerSk}, user1Pk, ONE_TOKEN);
            });

            it('should succeed', async () => {
                let nonce = await fungible.getTransactionCount(user1Pk);
                let txData = encodeWithdraw({pk: user1Pk, sk: user1Sk}, ONE_TOKEN, nonce, CHAIN_ID_OTHER);
                await fungible.sendOmniverseTransaction(txData);
                await utils.sleep(COOL_DOWN);
                await utils.evmMine(1);
                let ret = await fungible.triggerExecution();
                assert(ret.logs[0].event == 'OmniverseTokenWithdraw');
                let balance = await fungible.omniverseBalanceOf(user1Pk);
                assert('0' == balance, 'Balance should be zero');
                balance = await fungible.nativeBalanceOf(user1);
                assert('0' == balance, 'Balance should be zero');
            });
        });
    });
    
    describe('Request Deposit', function() {
        before(async function() {
            await initContract();
            await mintToken({pk: ownerPk, sk: ownerSk}, user1Pk, ONE_TOKEN);
            let nonce = await fungible.getTransactionCount(user1Pk);
            let txData = encodeWithdraw({pk: user1Pk, sk: user1Sk}, ONE_TOKEN, nonce);
            await fungible.sendOmniverseTransaction(txData);
            await utils.sleep(COOL_DOWN);
            await utils.evmMine(1);
            let ret = await fungible.triggerExecution();
        });

        describe('Signer and sender not match', function() {
            it('should fail', async () => {
                await utils.expectThrow(fungible.requestDeposit(user1Pk, ONE_TOKEN, {from: user2}), 'Signer not sender');
            });
        });

        describe('Deposit amount exceeds balance', function() {
            it('should fail', async () => {
                await utils.expectThrow(fungible.requestDeposit(user1Pk, HUNDRED_TOKEN, {from: user1}), 'Exceed balance');
            });
        });

        describe('All condition satisfied', function() {
            it('should succeed', async () => {
                await fungible.requestDeposit(user1Pk, ONE_TOKEN, {from: user1});
                let index = await fungible.depositDealingIndex();
                assert(index == 0);
                let request = await fungible.getDepositRequest(index);
                assert(request.receiver == user1Pk);
                assert(request.amount == ONE_TOKEN);
                let balance = await fungible.nativeBalanceOf(user1);
                assert('0' == balance, 'Balance should be zero');
                balance = await fungible.omniverseBalanceOf(user1Pk);
                assert('0' == balance, 'Balance should be zero');
            });
        });
    });
    
    describe('Approve Deposit', function() {
        before(async function() {
            await initContract();
            await mintToken({pk: ownerPk, sk: ownerSk}, user1Pk, ONE_TOKEN);
            let nonce = await fungible.getTransactionCount(user1Pk);
            let txData = encodeWithdraw({pk: user1Pk, sk: user1Sk}, ONE_TOKEN, nonce);
            await fungible.sendOmniverseTransaction(txData);
            await utils.sleep(COOL_DOWN);
            await utils.evmMine(1);
            let ret = await fungible.triggerExecution();
            await fungible.requestDeposit(user1Pk, ONE_TOKEN, {from: user1});
        });

        describe('Sender not the committee', function() {
            it('should fail', async () => {
                await utils.expectThrow(fungible.approveDeposit(1, 0, '0x', {from: user1}), 'Not committee');
            });
        });

        describe('Index is not current', function() {
            it('should fail', async () => {
                let nonce = await fungible.getTransactionCount(committeePk);
                let txData = encodeDeposit({pk: committeePk, sk: committeeSk}, user1Pk, ONE_TOKEN, nonce, CHAIN_ID);
                await utils.expectThrow(fungible.approveDeposit(1, txData.nonce, txData.signature, {from: committee}), 'Index error');
            });
        });

        describe('Index out of bound', function() {
            it('should fail', async () => {
                let nonce = await fungible.getTransactionCount(committeePk);
                let txData = encodeDeposit({pk: committeePk, sk: committeeSk}, user1Pk, ONE_TOKEN, nonce, CHAIN_ID);
                await utils.expectThrow(fungible.approveDeposit(1, txData.nonce, txData.signature, {from: committee}), 'error');
            });
        });

        describe('All condition satisfied', function() {
            it('should succeed', async () => {
                let nonce = await fungible.getTransactionCount(committeePk);
                let txData = encodeDeposit({pk: committeePk, sk: committeeSk}, user1Pk, ONE_TOKEN, nonce, CHAIN_ID);
                await fungible.approveDeposit(0, txData.nonce, txData.signature, {from: committee});
            });
        });
    });
    
    describe('Deposit', function() {
        before(async function() {
            await initContract();
            await mintToken({pk: ownerPk, sk: ownerSk}, user1Pk, ONE_TOKEN);
            let nonce = await fungible.getTransactionCount(user1Pk);
            let txData = encodeWithdraw({pk: user1Pk, sk: user1Sk}, ONE_TOKEN, nonce);
            await fungible.sendOmniverseTransaction(txData);
            await utils.sleep(COOL_DOWN);
            await utils.evmMine(1);
            let ret = await fungible.triggerExecution();
            await fungible.requestDeposit(user1Pk, ONE_TOKEN, {from: user1});
        });

        describe('All conditions satisfied', function() {
            it('should succeed', async () => {
                let nonce = await fungible.getTransactionCount(committeePk);
                let txData = encodeDeposit({pk: committeePk, sk: committeeSk}, user1Pk, ONE_TOKEN, nonce, CHAIN_ID);
                await fungible.approveDeposit(0, txData.nonce, txData.signature, {from: committee});
                await utils.sleep(COOL_DOWN);
                await utils.evmMine(1);
                let ret = await fungible.triggerExecution();
                assert(ret.logs[1].event == 'OmniverseTokenDeposit');
                let balance = await fungible.nativeBalanceOf(user1);
                assert('0' == balance, 'Balance should be zero');
                balance = await fungible.omniverseBalanceOf(user1Pk);
                assert(ONE_TOKEN == balance, 'Balance should be one');
            });
        });

        describe('Message received from other chain', function() {
            before(async function() {
                await initContract();
                await fungible.setMembers([[CHAIN_ID_OTHER, Fungible.address]]);
            });

            it('should succeed', async () => {
                let nonce = await fungible.getTransactionCount(committeePk);
                let txData = encodeDeposit({pk: committeePk, sk: committeeSk}, user1Pk, ONE_TOKEN, nonce, CHAIN_ID_OTHER);
                await fungible.sendOmniverseTransaction(txData);
                await utils.sleep(COOL_DOWN);
                await utils.evmMine(1);
                let ret = await fungible.triggerExecution();
                assert(ret.logs[0].event == 'OmniverseTokenDeposit');
                let balance = await fungible.nativeBalanceOf(user1);
                assert('0' == balance, 'Balance should be zero');
                balance = await fungible.omniverseBalanceOf(user1Pk);
                assert(ONE_TOKEN == balance, 'Balance should be one');
            });
        });
    });
});