<template>
  <div class="page">
    <div class="page__header">
      <ButtonBack />
      <h1 class="page__title">
        <FontAwesomeIcon :icon="['fas', 'chart-pie']" />
        Statistiques
      </h1>
      <p class="page__subtitle">Évolution mensuelle de la production</p>
    </div>

    <div v-if="loading" class="loading-state">
      <Loader text="Chargement des statistiques..." />
    </div>

    <div v-else-if="errorMsg" class="error-state">
      <FontAwesomeIcon :icon="['fas', 'circle-exclamation']" />
      <p>{{ errorMsg }}</p>
    </div>

    <template v-else>
      <!-- Carte graphique -->
      <div class="chart-card">
        <div class="chart-card__header">
          <h2 class="chart-card__title">Batteries par mois</h2>
          <div class="legend">
            <span class="legend__item legend__item--stock">
              <span class="legend__dot" />
              Mises en stock
            </span>
            <span class="legend__item legend__item--exp">
              <span class="legend__dot" />
              Expédiées
            </span>
          </div>
        </div>
        <div class="chart-wrapper" ref="chartWrapper">
          <svg ref="svgEl" class="chart-svg" />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import * as d3 from 'd3'
import { getMonthlyStats } from '@/services/batteries.js'
import ButtonBack from '@/components/ui/ButtonBack.vue'
import Loader from '@/components/ui/Loader.vue'

const loading = ref(true)
const errorMsg = ref('')
const chartData = ref([])
const svgEl = ref(null)
const chartWrapper = ref(null)

// --- Couleurs (adapté au thème REVAW) ---
const COLOR_STOCK = 'var(--revaw-primary)'
const COLOR_EXP = 'var(--color-success)'
const COLOR_STOCK_HEX = '#6366f1'
const COLOR_EXP_HEX = '#22c55e'

// --- ResizeObserver pour responsive ---
let resizeObserver = null

function formatMonthLabel(monthStr) {
  // "2024-03" → "Mar 24"
  const [year, month] = monthStr.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
}

function drawChart() {
  const data = chartData.value
  if (!data.length || !svgEl.value || !chartWrapper.value) return

  const container = chartWrapper.value
  const totalWidth = container.clientWidth || 800
  const totalHeight = 380

  const margin = { top: 20, right: 24, bottom: 56, left: 48 }
  const width = totalWidth - margin.left - margin.right
  const height = totalHeight - margin.top - margin.bottom

  // Nettoyer le SVG précédent
  d3.select(svgEl.value).selectAll('*').remove()

  const svg = d3
    .select(svgEl.value)
    .attr('width', totalWidth)
    .attr('height', totalHeight)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`)

  // --- Scales ---
  const x = d3
    .scalePoint()
    .domain(data.map((d) => d.month))
    .range([0, width])
    .padding(0.3)

  const maxVal = d3.max(data, (d) => Math.max(d.stock, d.expeditions)) || 1
  const y = d3.scaleLinear().domain([0, maxVal * 1.15]).range([height, 0]).nice()

  // --- Grille horizontale ---
  svg
    .append('g')
    .attr('class', 'grid')
    .call(
      d3
        .axisLeft(y)
        .tickSize(-width)
        .tickFormat('')
        .ticks(5),
    )
    .call((g) => g.select('.domain').remove())
    .call((g) =>
      g
        .selectAll('.tick line')
        .attr('stroke', 'var(--border-light)')
        .attr('stroke-dasharray', '4,3'),
    )

  // --- Axe X ---
  svg
    .append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x).tickFormat(formatMonthLabel))
    .call((g) => g.select('.domain').attr('stroke', 'var(--border-default)'))
    .call((g) => g.selectAll('.tick line').remove())
    .call((g) =>
      g
        .selectAll('.tick text')
        .attr('fill', 'var(--text-secondary)')
        .attr('font-size', '11px')
        .attr('dy', '1.2em'),
    )

  // --- Axe Y ---
  svg
    .append('g')
    .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('d')))
    .call((g) => g.select('.domain').remove())
    .call((g) => g.selectAll('.tick line').remove())
    .call((g) =>
      g
        .selectAll('.tick text')
        .attr('fill', 'var(--text-secondary)')
        .attr('font-size', '11px'),
    )

  // --- Line generators ---
  const lineStock = d3
    .line()
    .x((d) => x(d.month))
    .y((d) => y(d.stock))
    .curve(d3.curveMonotoneX)

  const lineExp = d3
    .line()
    .x((d) => x(d.month))
    .y((d) => y(d.expeditions))
    .curve(d3.curveMonotoneX)

  // --- Lignes ---
  svg
    .append('path')
    .datum(data)
    .attr('fill', 'none')
    .attr('stroke', COLOR_STOCK_HEX)
    .attr('stroke-width', 2.5)
    .attr('d', lineStock)

  svg
    .append('path')
    .datum(data)
    .attr('fill', 'none')
    .attr('stroke', COLOR_EXP_HEX)
    .attr('stroke-width', 2.5)
    .attr('d', lineExp)

  // --- Tooltip ---
  const tooltip = d3
    .select(container)
    .append('div')
    .attr('class', 'chart-tooltip')
    .style('opacity', 0)
    .style('position', 'absolute')
    .style('pointer-events', 'none')

  // --- Points stock ---
  svg
    .selectAll('.dot-stock')
    .data(data)
    .join('circle')
    .attr('class', 'dot-stock')
    .attr('cx', (d) => x(d.month))
    .attr('cy', (d) => y(d.stock))
    .attr('r', 4)
    .attr('fill', COLOR_STOCK_HEX)
    .attr('stroke', 'var(--bg-primary)')
    .attr('stroke-width', 2)
    .on('mouseover', (event, d) => showTooltip(event, d, tooltip, container))
    .on('mouseleave', () => hideTooltip(tooltip))

  // --- Points expéditions ---
  svg
    .selectAll('.dot-exp')
    .data(data)
    .join('circle')
    .attr('class', 'dot-exp')
    .attr('cx', (d) => x(d.month))
    .attr('cy', (d) => y(d.expeditions))
    .attr('r', 4)
    .attr('fill', COLOR_EXP_HEX)
    .attr('stroke', 'var(--bg-primary)')
    .attr('stroke-width', 2)
    .on('mouseover', (event, d) => showTooltip(event, d, tooltip, container))
    .on('mouseleave', () => hideTooltip(tooltip))
}

function showTooltip(event, d, tooltip, container) {
  const rect = container.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  tooltip
    .style('opacity', 1)
    .style('left', `${x + 12}px`)
    .style('top', `${y - 12}px`)
    .html(
      `<div class="tooltip-month">${formatMonthLabel(d.month)}</div>
       <div class="tooltip-row"><span class="tooltip-dot tooltip-dot--stock"></span>En stock : <strong>${d.stock}</strong></div>
       <div class="tooltip-row"><span class="tooltip-dot tooltip-dot--exp"></span>Expédiées : <strong>${d.expeditions}</strong></div>`,
    )
}

function hideTooltip(tooltip) {
  tooltip.style('opacity', 0)
}

onMounted(async () => {
  try {
    chartData.value = await getMonthlyStats()
  } catch {
    errorMsg.value = 'Impossible de charger les statistiques.'
  } finally {
    loading.value = false
  }

  await nextTick()
  drawChart()

  resizeObserver = new ResizeObserver(() => drawChart())
  if (chartWrapper.value) resizeObserver.observe(chartWrapper.value)
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})
</script>

<style lang="scss" scoped>
.page__title {
  display: flex;
  align-items: center;
  gap: $spacing-3;

  svg {
    color: var(--role-superadmin-text);
  }
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: $spacing-12;
  text-align: center;
}

.error-state {
  color: var(--color-error);
  gap: $spacing-3;

  svg {
    font-size: 48px;
    opacity: 0.5;
  }
}

// Carte graphique
.chart-card {
  @include card($spacing-6);
  margin-bottom: $spacing-6;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $spacing-5;
  }

  &__title {
    font-size: $font-size-base;
    font-weight: $font-weight-semibold;
    color: var(--text-primary);
    margin: 0;
  }
}

.chart-wrapper {
  position: relative;
  width: 100%;
  overflow: visible;
}

.chart-svg {
  display: block;
  width: 100%;
  overflow: visible;
}

// Légende
.legend {
  display: flex;
  gap: $spacing-5;

  &__item {
    display: flex;
    align-items: center;
    gap: $spacing-2;
    font-size: $font-size-sm;
    color: var(--text-secondary);
  }

  &__dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  &__item--stock .legend__dot {
    background-color: #6366f1;
  }

  &__item--exp .legend__dot {
    background-color: #22c55e;
  }
}
</style>

<!-- Styles globaux pour le tooltip D3 (non scoped) -->
<style lang="scss">
.chart-tooltip {
  background: var(--bg-primary);
  border: 1px solid var(--border-default);
  border-radius: $radius-md;
  padding: $spacing-3;
  font-size: $font-size-xs;
  box-shadow: $shadow-md;
  min-width: 140px;
  z-index: 10;
  transition: opacity 0.1s ease;

  .tooltip-month {
    font-weight: $font-weight-semibold;
    color: var(--text-primary);
    margin-bottom: $spacing-2;
    font-size: $font-size-sm;
  }

  .tooltip-row {
    display: flex;
    align-items: center;
    gap: $spacing-2;
    color: var(--text-secondary);
    margin-bottom: $spacing-1;

    strong {
      color: var(--text-primary);
      margin-left: auto;
      padding-left: $spacing-2;
    }
  }

  .tooltip-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;

    &--stock { background-color: #6366f1; }
    &--exp { background-color: #22c55e; }
  }
}
</style>
