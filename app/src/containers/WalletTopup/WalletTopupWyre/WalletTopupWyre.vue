<template>
  <WalletTopupBase
    selected-provider="wyre"
    :crypto-currency-value="cryptoCurrencyValue"
    :currency-rate="currencyRate"
    @fetchQuote="fetchQuote"
    @sendOrder="sendOrder"
    @clearQuote="clearQuote"
  />
</template>

<script>
import throttle from 'lodash.throttle'
import log from 'loglevel'

import WalletTopupBase from '../../../components/WalletTopup/WalletTopupBase'

export default {
  components: {
    WalletTopupBase,
  },
  data() {
    return {
      cryptoCurrencyValue: 0,
      currencyRate: 0,
      currentOrder: {},
    }
  },
  methods: {
    fetchQuote(payload) {
      const self = this
      throttle(() => {
        self.$store
          .dispatch('fetchWyreQuote', payload)
          .then((result) => {
            self.currencyRate = parseFloat(result.data.exchangeRate)
            self.cryptoCurrencyValue = result.data.destAmount
            self.currentOrder = result.data
          })
          .catch((error) => log.error(error))
      }, 0)()
    },
    sendOrder(callback) {
      callback(this.$store.dispatch('fetchWyreOrder', { currentOrder: this.currentOrder, selectedAddress: this.$store.state.selectedAddress }))
    },
    clearQuote(payload) {
      this.cryptoCurrencyValue = 0
      this.currencyRate = 0
      this.currentOrder = {}
      this.fetchQuote(payload)
    },
  },
}
</script>

<style lang="scss" scoped>
@import 'WalletTopupWyre.scss';
</style>
