import EthQuery from 'eth-query'
import log from 'loglevel'
import ObservableStore from 'obs-store'
import pify from 'pify'

import { KOVAN, MAINNET, RINKEBY, ROPSTEN } from '../utils/enums'

const INFURA_PROVIDER_TYPES = [ROPSTEN, RINKEBY, KOVAN, MAINNET]

class RecentBlocksController {
  /**
   * Controller responsible for storing, updating and managing the recent history of blocks. Blocks are back filled
   * upon the controller's construction and then the list is updated when the given block tracker gets a 'latest' event
   * (indicating that there is a new block to process).
   *
   * @typedef {Object} RecentBlocksController
   * @param {object} opts Contains objects necessary for tracking blocks and querying the blockchain
   * @param {BlockTracker} opts.blockTracker Contains objects necessary for tracking blocks and querying the blockchain
   * @param {BlockTracker} opts.provider The provider used to create a new EthQuery instance.
   * @property {BlockTracker} blockTracker Points to the passed BlockTracker. On RecentBlocksController construction,
   * listens for 'latest' events so that new blocks can be processed and added to storage.
   * @property {EthQuery} ethQuery Points to the EthQuery instance created with the passed provider
   * @property {number} historyLength The maximum length of blocks to track
   * @property {object} store Stores the recentBlocks
   * @property {array} store.recentBlocks Contains all recent blocks, up to a total that is equal to this.historyLength
   *
   */
  constructor(options = {}) {
    const { blockTracker, provider, networkController } = options
    this.blockTracker = blockTracker
    this.ethQuery = new EthQuery(provider)
    this.historyLength = options.historyLength || 5

    const initState = {
      recentBlocks: [],
      ...options.initState,
    }
    this.store = new ObservableStore(initState)

    // eslint-disable-next-line unicorn/consistent-function-scoping
    const blockListner = async (newBlockNumberHex) => {
      try {
        await this.processBlock(newBlockNumberHex)
      } catch (error) {
        log.error(error)
      }
    }
    let isListening = false
    const { type } = networkController.getProviderConfig()
    if (!INFURA_PROVIDER_TYPES.includes(type) && type !== 'loading') {
      this.blockTracker.on('latest', blockListner)
      isListening = true
    }
    networkController.on('networkDidChange', (newType) => {
      if (INFURA_PROVIDER_TYPES.includes(newType) && isListening) {
        this.blockTracker.removeListener('latest', blockListner)
      } else if (!INFURA_PROVIDER_TYPES.includes(type) && type !== 'loading' && !isListening) {
        this.blockTracker.on('latest', blockListner)
      }
    })
    this.backfill()
  }

  /**
   * Receives a new block and modifies it with this.mapTransactionsToPrices. Then adds that block to the recentBlocks
   * array in storage. If the recentBlocks array contains the maximum number of blocks, the oldest block is removed.
   *
   * @param {object} newBlock The new block to modify and add to the recentBlocks array
   *
   */
  async processBlock(newBlockNumberHex) {
    const newBlockNumber = Number.parseInt(newBlockNumberHex, 16)
    const newBlock = await this.getBlockByNumber(newBlockNumber)
    if (!newBlock) return

    const block = this.mapTransactionsToPrices(newBlock)

    const state = this.store.getState()
    state.recentBlocks.push(block)

    while (state.recentBlocks.length > this.historyLength) {
      state.recentBlocks.shift()
    }

    this.store.updateState(state)
  }

  /**
   * Receives a new block and modifies it with this.mapTransactionsToPrices. Adds that block to the recentBlocks
   * array in storage, but only if the recentBlocks array contains fewer than the maximum permitted.
   *
   * Unlike this.processBlock, backfillBlock adds the modified new block to the beginning of the recent block array.
   *
   * @param {object} newBlock The new block to modify and add to the beginning of the recentBlocks array
   *
   */
  backfillBlock(newBlock) {
    const block = this.mapTransactionsToPrices(newBlock)

    const state = this.store.getState()

    if (state.recentBlocks.length < this.historyLength) {
      state.recentBlocks.unshift(block)
    }

    this.store.updateState(state)
  }

  /**
   * Receives a block and gets the gasPrice of each of its transactions. These gas prices are added to the block at a
   * new property, and the block's transactions are removed.
   *
   * @param {object} newBlock The block to modify. It's transaction array will be replaced by a gasPrices array.
   * @returns {object} The modified block.
   *
   */
  mapTransactionsToPrices(newBlock) {
    const block = {
      ...newBlock,
      gasPrices: newBlock.transactions.map((tx) => tx.gasPrice),
    }
    delete block.transactions
    return block
  }

  /**
   * On this.blockTracker's first 'latest' event after this RecentBlocksController's instantiation, the store.recentBlocks
   * array is populated with this.historyLength number of blocks. The block number of the this.blockTracker's first
   * 'latest' event is used to iteratively generate all the numbers of the previous blocks, which are obtained by querying
   * the blockchain. These blocks are backfilled so that the recentBlocks array is ordered from oldest to newest.
   *
   * Each iteration over the block numbers is delayed by 100 milliseconds.
   *
   * @returns {Promise<void>} Promises undefined
   */
  async backfill() {
    this.blockTracker.once('latest', async (blockNumberHex) => {
      const currentBlockNumber = Number.parseInt(blockNumberHex, 16)
      const blocksToFetch = Math.min(currentBlockNumber, this.historyLength)
      const previousBlockNumber = currentBlockNumber - 1
      const targetBlockNumbers = new Array(blocksToFetch).fill().map((_, index) => previousBlockNumber - index)
      await Promise.all(
        targetBlockNumbers.map(async (targetBlockNumber) => {
          try {
            const newBlock = await this.getBlockByNumber(targetBlockNumber)
            if (!newBlock) return

            this.backfillBlock(newBlock)
          } catch (error) {
            log.error(error)
          }
        })
      )
    })
  }

  /**
   * Uses EthQuery to get a block that has a given block number.
   *
   * @param {number} number The number of the block to get
   * @returns {Promise<object>} Promises A block with the passed number
   *
   */
  async getBlockByNumber(number) {
    const blockNumberHex = `0x${number.toString(16)}`
    const result = await pify(this.ethQuery.getBlockByNumber).call(this.ethQuery, blockNumberHex, true)
    return result
  }
}

export default RecentBlocksController
