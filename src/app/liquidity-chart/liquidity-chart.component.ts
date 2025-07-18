import {
  Component,
  Input,
  OnInit,
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
} from 'chart.js';

@Component({
  selector: 'app-liquidity-chart',
  imports: [],
  templateUrl: './liquidity-chart.component.html',
  styleUrl: './liquidity-chart.component.css',
})
export class LiquidityChartComponent
  implements OnInit, AfterViewInit, OnDestroy, OnChanges
{
  @Input() liquidityData!: PoolLiquidity | null;
  @Input() previewData!: { lowPrice: number; highPrice: number } | null;

  @ViewChild('liquidityChart') chartRef!: ElementRef<HTMLCanvasElement>;
  chart!: Chart;
  maxPoint!: number;

  ngOnInit(): void {
    this.generateChartConfiguration();
  }

  ngAfterViewInit(): void {
    this.renderChart();
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  ngOnChanges(): void {
    if (this.previewData) {
      this.chart.data.datasets[3].data =
        this.liquidityData?.liquidityPoints.map(point =>
          point.price >= (this.previewData?.lowPrice ?? 0) &&
          point.price <= (this.previewData?.highPrice ?? 0)
            ? this.maxPoint
            : 0
        ) ?? [];

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
    Chart.register(Filler);
    this.chart = new Chart(this.chartRef?.nativeElement, config);
  }

  generateChartConfiguration(): ChartConfiguration {
    this.maxPoint = Math.max(
      ...(this.liquidityData?.liquidityPoints.map(lp =>
        new Decimal(lp.x_amount).add(lp.y_amount).toNumber()
      ) ?? [])
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
        borderWidth: 1,
      },
      {
        label: 'Y Amount',
        data:
          this.liquidityData?.liquidityPoints.map(point =>
            new Decimal(point.y_amount).toNumber()
          ) ?? [],
        backgroundColor: 'rgba(153, 102, 255, 0.5)',
        borderColor: 'rgba(153, 102, 255, 1)',
        borderWidth: 1,
      },
      {
        label: 'Current Price',
        data:
          this.liquidityData?.liquidityPoints.map(point =>
            point.price === this.liquidityData?.price ? this.maxPoint : 0
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
        backgroundColor: 'rgba(255, 206, 86, 0.2)',
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
        scales: {
          x: {
            title: {
              display: false,
              text: 'Price',
            },
            grid: {
              display: false,
            },
          },
          y: {
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
}
