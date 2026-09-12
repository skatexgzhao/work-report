<template>
  <div v-if="total > 0" class="list-pagination">
    <el-pagination
      background
      layout="total, prev, pager, next, sizes"
      :total="total"
      :current-page="page"
      :page-size="pageSize"
      :page-sizes="[10, 20, 50]"
      @current-change="onPageChange"
      @size-change="onSizeChange"
    />
  </div>
</template>

<script setup>
const props = defineProps({
  total: { type: Number, default: 0 },
  page: { type: Number, default: 1 },
  pageSize: { type: Number, default: 20 }
})

const emit = defineEmits(['update:page', 'update:pageSize', 'change'])

function onPageChange(p) {
  emit('update:page', p)
  emit('change')
}

function onSizeChange(size) {
  emit('update:pageSize', size)
  emit('update:page', 1)
  emit('change')
}
</script>

<style scoped>
.list-pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
