export interface SlideData {
  label: string;
  detail: string;
  link: string;
  updatedAt: string;
  accentOverride?: string;
  renderData: Record<string, any>;
}

export interface SlideModule {
  id: string;
  fetchData(): Promise<SlideData | null>;
  render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    frame: number,
    data: SlideData,
    theme: { accent: string; border: string }
  ): void;
  reset?(): void;
}
