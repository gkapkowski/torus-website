<template>
  <v-layout class="home-cards token-balance-tab-container" wrap align-center>
    <v-flex v-for="(balance, index) in tokenBalances" :key="index" class="xs12 sm6 px-4 my-4" :style="`order: ${index > 0 ? index + 1 : index}`">
      <v-card color="card-shadow pb-6 pt-1" router-link :to="{ name: 'walletTransfer', query: { contract: balance.tokenAddress } }">
        <v-card-text class="text_1--text py-6 px-6">
          <v-layout>
            <v-flex xs8>
              <img
                :src="require(`../../../../public/images/logos/${balance.logo}`)"
                class="inline-small d-inline-flex"
                onerror="if (this.src != 'eth.svg') this.src = 'images/logos/eth.svg';"
                :alt="balance.logo"
              />
              <span class="subtitle-1 ml-2">{{ balance.name }}</span>
            </v-flex>
            <v-flex xs4 class="text-right">
              {{ balance.formattedBalance }}
            </v-flex>
          </v-layout>
          <v-divider class="my-1"></v-divider>
          <v-layout class="font-weight-regular text_2--text">
            <v-flex xs6>
              {{ balance.currencyRateText }}
            </v-flex>
            <v-flex xs6 class="text-right">
              {{ balance.currencyBalance }}
            </v-flex>
          </v-layout>
        </v-card-text>
      </v-card>
    </v-flex>
  </v-layout>
</template>

<script>
export default {
  props: {
    tokenBalances: {
      type: Array,
      default() {
        return []
      },
    },
  },
  data() {
    return {
      pagination: {
        sortBy: 'name',
      },
      dialog: false,
    }
  },
  computed: {
    showFooter() {
      return this.tokenBalances.length > 5
    },
  },
  methods: {
    changeSort(column) {
      if (this.pagination.sortBy === column) {
        this.pagination.descending = !this.pagination.descending
      } else {
        this.pagination.sortBy = column
        this.pagination.descending = false
      }
    },
    selectEmit(item) {
      this.$emit('update:select', item)
    },
  },
}
</script>

<style lang="scss" scoped>
@import 'TokenBalancesTable.scss';
</style>
