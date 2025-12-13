import {
  Component,
  Input,
  AfterViewInit,
  ViewChild,
  ElementRef,
  OnDestroy,
  OnChanges,
} from '@angular/core';
import { PoolLiquidity } from '../pool.service';
import Decimal from 'decimal.js';
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  ChartConfiguration,
  ChartDataset,
  Filler,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  TimeScale,
} from 'chart.js';

@Component({
  selector: 'app-liquidity-chart',
  imports: [],
  templateUrl: './liquidity-chart.component.html',
  styleUrl: './liquidity-chart.component.css',
})
export class LiquidityChartComponent
  implements AfterViewInit, OnDestroy, OnChanges
{
  @Input() liquidityData!: PoolLiquidity | null;
  @Input() priceHistory!: Record<string, number> | null;
  @Input() previewData!: { lowPrice: number; highPrice: number } | null;

  @ViewChild('liquidityChart') chartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('historicalChart')
  historicalChartRef!: ElementRef<HTMLCanvasElement>;
  chart!: Chart;
  historicalChart!: Chart;
  maxPoint!: number;

  ngAfterViewInit(): void {
    this.renderChart();
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
    this.historicalChart?.destroy();
  }

  ngOnChanges(): void {
    if (this.previewData && this.chart?.data.datasets.length >= 3) {
      this.chart.data.datasets[3].data =
        this.liquidityData?.liquidityPoints.map(point =>
          point.price >= (this.previewData?.lowPrice ?? 0) &&
          point.price <= (this.previewData?.highPrice ?? 0)
            ? this.maxPoint
            : 0
        ) ?? [];

      if (
        Object.keys(this.priceHistory ?? {})?.length &&
        this.historicalChart
      ) {
        this.historicalChart.data.datasets[1].data =
          Object.keys(this.priceHistory ?? {}).map(
            () => this.previewData?.lowPrice ?? 0
          ) ?? [];

        this.historicalChart.data.datasets[2].data =
          Object.keys(this.priceHistory ?? {}).map(
            () => this.previewData?.highPrice ?? 0
          ) ?? [];
        this.historicalChart.update();
      }

      this.chart.update();
    }
  }

  renderChart(): void {
    const config = this.generateChartConfiguration();
    Chart.register(CategoryScale);
    Chart.register(LinearScale);
    Chart.register(BarController);
    Chart.register(BarElement);
    Chart.register(LineController);
    Chart.register(LineElement);
    Chart.register(PointElement);
    Chart.register(TimeScale);
    Chart.register(Filler);
    this.chart = new Chart(this.chartRef?.nativeElement, config);

    if (Object.keys(this.priceHistory ?? {})?.length) {
      this.historicalChart = new Chart(
        this.historicalChartRef?.nativeElement,
        this.generateHistoricalPriceChartConfiguration()
      );
    }
  }

  generateChartConfiguration(): ChartConfiguration {
    this.maxPoint = Math.max(
      ...(this.liquidityData?.liquidityPoints.map(lp =>
        new Decimal(lp.x_amount).add(lp.y_amount).toNumber()
      ) ?? [])
    );

    const currentPriceIndex = this.liquidityData?.liquidityPoints.findIndex(
      point =>
        point.price >= (this.liquidityData?.price || 0) ? this.maxPoint : 0
    );

    const datasets: ChartDataset[] = [
      {
        label: 'X Amount',
        data:
          this.liquidityData?.liquidityPoints.map(point =>
            new Decimal(point.x_amount).toNumber()
          ) ?? [],
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 2,
      },
      {
        label: 'Y Amount',
        data:
          this.liquidityData?.liquidityPoints.map(point =>
            new Decimal(point.y_amount).toNumber()
          ) ?? [],
        backgroundColor: 'rgba(153, 102, 255, 0.5)',
        borderColor: 'rgba(153, 102, 255, 1)',
        borderWidth: 2,
      },
      {
        label: 'Current Price',
        data:
          this.liquidityData?.liquidityPoints.map((_, i) =>
            i === currentPriceIndex ? this.maxPoint : 0
          ) ?? [],
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        borderWidth: 3,
      },
    ];

    if (this.previewData) {
      datasets.push({
        label: 'Range Preview',
        data:
          this.liquidityData?.liquidityPoints.map(point =>
            point.price >= (this.previewData?.lowPrice ?? 0) &&
            point.price <= (this.previewData?.highPrice ?? 0)
              ? this.maxPoint
              : 0
          ) ?? [],
        borderColor: 'rgba(255, 206, 86, 1)',
        // backgroundColor: 'rgba(255, 206, 86, 0.2)',
        borderWidth: 3,
        type: 'line',
        pointBorderWidth: 0,
        pointRadius: 0,
        fill: 'start',
      });
    }

    return {
      type: 'bar',
      data: {
        labels: this.liquidityData?.liquidityPoints.map(point => point.price),
        datasets: datasets,
      },
      options: {
        indexAxis: 'y',
        scales: {
          x: {
            type: 'linear',
            display: false,
            title: {
              display: false,
              text: 'Price',
            },
            grid: {
              display: false,
            },
          },
          y: {
            display: false,
            title: {
              display: false,
              text: 'Liquidity',
            },
            grid: {
              display: false,
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
          filler: {
            propagate: false,
          },
        },
      },
    };
  }

  generateHistoricalPriceChartConfiguration(): ChartConfiguration {
    const datasets: ChartDataset[] = [
      {
        data: Object.values(this.priceHistory ?? {}) ?? [],
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        borderWidth: 3,
        pointRadius: 0,
        tension: 0,
      },
      {
        data: [],
        borderColor: 'rgba(255, 206, 86, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        borderWidth: 3,
        pointRadius: 0,
        tension: 0,
      },
      {
        data: [],
        borderColor: 'rgba(255, 206, 86, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        borderWidth: 3,
        pointRadius: 0,
        tension: 0,
      },
    ];

    return {
      type: 'line',
      data: {
        labels: Object.keys(this.priceHistory ?? {}) ?? [],
        datasets: datasets,
      },
      options: {
        scales: {
          x: {
            display: false,
            title: {
              display: false,
            },
            grid: {
              display: false,
            },
          },
          y: {
            display: false,
            title: {
              display: false,
            },
            grid: {
              display: false,
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
          filler: {
            propagate: false,
          },
        },
      },
    };
  }
}
