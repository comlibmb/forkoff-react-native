/**
 * SVG path generation utilities for the WaveAreaChart.
 * Uses monotone cubic interpolation for smooth, overshoot-free curves.
 */

export interface Point {
  x: number;
  y: number;
}

/**
 * Compute monotone cubic Hermite tangents for a set of points.
 * Prevents overshooting between data points (Fritsch–Carlson method).
 */
function monotoneTangents(points: Point[]): number[] {
  const n = points.length;
  const d: number[] = []; // slopes between consecutive points
  const m: number[] = []; // tangent at each point

  for (let i = 0; i < n - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    d[i] = dx === 0 ? 0 : (points[i + 1].y - points[i].y) / dx;
  }

  m[0] = d[0];
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) {
      m[i] = 0;
    } else {
      m[i] = (d[i - 1] + d[i]) / 2;
    }
  }
  m[n - 1] = d[n - 2];

  // Fritsch–Carlson monotonicity constraints
  for (let i = 0; i < n - 1; i++) {
    if (Math.abs(d[i]) < 1e-12) {
      m[i] = 0;
      m[i + 1] = 0;
    } else {
      const alpha = m[i] / d[i];
      const beta = m[i + 1] / d[i];
      const s = alpha * alpha + beta * beta;
      if (s > 9) {
        const t = 3 / Math.sqrt(s);
        m[i] = t * alpha * d[i];
        m[i + 1] = t * beta * d[i];
      }
    }
  }

  return m;
}

/**
 * Build an SVG path string for a monotone cubic curve through points.
 * Returns a path starting with M and using C commands.
 */
export function buildMonotonePath(points: Point[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    return `M${points[0].x},${points[0].y}`;
  }
  if (points.length === 2) {
    return `M${points[0].x},${points[0].y}L${points[1].x},${points[1].y}`;
  }

  const tangents = monotoneTangents(points);
  let path = `M${points[0].x},${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const dx = (p1.x - p0.x) / 3;

    const cp1x = p0.x + dx;
    const cp1y = p0.y + tangents[i] * dx;
    const cp2x = p1.x - dx;
    const cp2y = p1.y - tangents[i + 1] * dx;

    path += `C${cp1x},${cp1y},${cp2x},${cp2y},${p1.x},${p1.y}`;
  }

  return path;
}

/**
 * Build a closed area path: curve along the top, then straight line along the bottom.
 */
export function buildAreaPath(points: Point[], bottomY: number): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    // Single point: draw a thin vertical rectangle
    const p = points[0];
    return `M${p.x},${bottomY}L${p.x},${p.y}L${p.x},${bottomY}Z`;
  }

  const curvePath = buildMonotonePath(points);
  const lastPoint = points[points.length - 1];
  const firstPoint = points[0];

  return `${curvePath}L${lastPoint.x},${bottomY}L${firstPoint.x},${bottomY}Z`;
}

/**
 * Format a number for axis labels (e.g. 1500000 → "1.5M", 2300 → "2.3K")
 */
export function formatAxisLabel(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return Math.round(num).toString();
}

/**
 * Format a date string ("2025-01-15") into a short label ("Jan 15")
 */
export function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
