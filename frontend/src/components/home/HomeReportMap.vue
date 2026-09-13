<template>
  <div class="report-map">
    <p class="map-tagline">日报攒素材 → 自己的周/月/季 → 小组汇总 → 部门汇总</p>

    <svg
      class="map-svg"
      viewBox="0 0 920 200"
      role="img"
      aria-labelledby="report-map-title report-map-desc"
    >
      <title id="report-map-title">报告汇总关系示意</title>
      <desc id="report-map-desc">
        从日报到个人周期报告，再到小组报告与部门报告的层层汇总关系
      </desc>

      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill="#909399" />
        </marker>
      </defs>

      <!-- row 1: daily -->
      <g class="node node-daily">
        <rect x="40" y="24" width="140" height="56" rx="8" />
        <text x="110" y="48" text-anchor="middle" class="node-title">日报</text>
        <text x="110" y="68" text-anchor="middle" class="node-sub">记今天做了什么</text>
      </g>

      <!-- row 2: personal -->
      <g class="node node-personal">
        <rect x="240" y="24" width="160" height="56" rx="8" />
        <text x="320" y="48" text-anchor="middle" class="node-title">个人周报</text>
        <text x="320" y="68" text-anchor="middle" class="node-sub">引用已提交日报</text>
      </g>
      <g class="node node-personal">
        <rect x="240" y="100" width="160" height="56" rx="8" />
        <text x="320" y="124" text-anchor="middle" class="node-title">个人月报 / 季报</text>
        <text x="320" y="144" text-anchor="middle" class="node-sub">更长周期总结</text>
      </g>

      <!-- team -->
      <g class="node node-team">
        <rect x="480" y="62" width="160" height="56" rx="8" />
        <text x="560" y="86" text-anchor="middle" class="node-title">小组报告</text>
        <text x="560" y="106" text-anchor="middle" class="node-sub">汇总组员周期报告</text>
      </g>

      <!-- department -->
      <g class="node node-dept">
        <rect x="720" y="62" width="160" height="56" rx="8" />
        <text x="800" y="86" text-anchor="middle" class="node-title">部门报告</text>
        <text x="800" y="106" text-anchor="middle" class="node-sub">汇总小组或个人报告</text>
      </g>

      <!-- arrows -->
      <path d="M180 52 H230" class="edge" marker-end="url(#arrow)" />
      <path d="M180 52 C210 52 210 128 230 128" class="edge" marker-end="url(#arrow)" />
      <path d="M400 52 H470" class="edge" marker-end="url(#arrow)" />
      <path d="M400 128 C440 128 440 90 470 90" class="edge" marker-end="url(#arrow)" />
      <path d="M640 90 H710" class="edge" marker-end="url(#arrow)" />
    </svg>

    <ul class="map-text-fallback">
      <li><strong>日报</strong>：每天简短记录，提交后成为周期报告的素材。</li>
      <li><strong>个人周/月/季报</strong>：选素材、手写或用 AI 起稿，保存后提交。</li>
      <li><strong>小组 / 部门报告</strong>：负责人先创建小组；成员注册时自选小组，再在列表里新建本周期报告并汇总提交。</li>
    </ul>
  </div>
</template>

<style scoped>
.report-map {
  margin: 0;
}

.map-tagline {
  margin: 0 0 16px;
  font-size: 15px;
  color: #303133;
  font-weight: 500;
  text-align: center;
}

.map-svg {
  width: 100%;
  max-width: 920px;
  height: auto;
  display: block;
  margin: 0 auto 16px;
}

.node rect {
  fill: #ecf5ff;
  stroke: #409eff;
  stroke-width: 1.5;
}

.node-daily rect {
  fill: #f0f9eb;
  stroke: #67c23a;
}

.node-team rect {
  fill: #fdf6ec;
  stroke: #e6a23c;
}

.node-dept rect {
  fill: #fef0f0;
  stroke: #f56c6c;
}

.node-title {
  font-size: 14px;
  fill: #303133;
  font-weight: 600;
}

.node-sub {
  font-size: 11px;
  fill: #606266;
}

.edge {
  fill: none;
  stroke: #c0c4cc;
  stroke-width: 1.5;
}

.map-text-fallback {
  margin: 0;
  padding-left: 20px;
  color: #606266;
  line-height: 1.75;
  font-size: 14px;
}

.map-text-fallback li {
  margin-bottom: 4px;
}
</style>
