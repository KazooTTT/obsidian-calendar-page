import { App, Component, MarkdownRenderer, TFile } from 'obsidian';

const OPEN_DELAY_MS = 250;
const CLOSE_DELAY_MS = 120;
const VIEWPORT_MARGIN = 12;
const ANCHOR_GAP = 8;

export class HoverPreview {
	private el: HTMLElement;
	private titleEl: HTMLElement;
	private contentEl: HTMLElement;
	private openTimer: number | null = null;
	private closeTimer: number | null = null;
	private requestId = 0;

	constructor(
		private app: App,
		parent: HTMLElement,
		private component: Component,
	) {
		this.el = parent.createDiv('periodic-calendar-page__hover-preview');
		this.el.setAttr('role', 'dialog');
		this.el.setAttr('aria-label', '笔记预览');
		this.titleEl = this.el.createDiv(
			'periodic-calendar-page__hover-preview-title',
		);
		this.contentEl = this.el.createDiv(
			'periodic-calendar-page__hover-preview-content markdown-rendered',
		);

		this.el.addEventListener('pointerenter', () => this.cancelClose());
		this.el.addEventListener('pointerleave', () => this.scheduleClose());
	}

	bind(target: HTMLElement, file: TFile, label: string): void {
		target.addEventListener('pointerenter', () => {
			this.scheduleOpen(target, file, label);
		});
		target.addEventListener('pointerleave', () => this.scheduleClose());
		target.addEventListener('focusin', () => {
			this.scheduleOpen(target, file, label);
		});
		target.addEventListener('focusout', () => this.scheduleClose());
	}

	hide(): void {
		this.clearTimers();
		this.requestId++;
		this.el.removeClass('is-visible');
	}

	private scheduleOpen(
		target: HTMLElement,
		file: TFile,
		label: string,
	): void {
		this.cancelClose();
		if (this.openTimer !== null) {
			window.clearTimeout(this.openTimer);
		}
		this.openTimer = window.setTimeout(() => {
			this.openTimer = null;
			void this.show(target, file, label);
		}, OPEN_DELAY_MS);
	}

	private async show(
		target: HTMLElement,
		file: TFile,
		label: string,
	): Promise<void> {
		const requestId = ++this.requestId;
		this.titleEl.setText(`${label} · ${file.basename}`);
		this.contentEl.empty();
		this.contentEl.createDiv({
			cls: 'periodic-calendar-page__hover-preview-loading',
			text: '正在加载…',
		});
		this.el.addClass('is-visible');
		this.position(target);

		let markdown: string;
		try {
			markdown = await this.app.vault.cachedRead(file);
		} catch (error) {
			if (requestId === this.requestId) {
				console.error(
					'[periodic-calendar-page] hover preview failed',
					error,
				);
				this.contentEl.empty();
				this.contentEl.createDiv({
					cls: 'periodic-calendar-page__hover-preview-empty',
					text: '无法读取这篇笔记',
				});
			}
			return;
		}
		if (requestId !== this.requestId) {
			return;
		}

		this.contentEl.empty();
		if (markdown.trim()) {
			try {
				await MarkdownRenderer.render(
					this.app,
					markdown,
					this.contentEl,
					file.path,
					this.component,
				);
			} catch (error) {
				if (requestId === this.requestId) {
					console.error(
						'[periodic-calendar-page] hover preview render failed',
						error,
					);
					this.contentEl.empty();
					this.contentEl.createDiv({
						cls: 'periodic-calendar-page__hover-preview-empty',
						text: '无法渲染这篇笔记',
					});
				}
			}
		} else {
			this.contentEl.createDiv({
				cls: 'periodic-calendar-page__hover-preview-empty',
				text: '这篇笔记暂时没有内容',
			});
		}
		if (requestId === this.requestId) {
			this.position(target);
		}
	}

	private position(target: HTMLElement): void {
		const anchor = target.getBoundingClientRect();
		const preview = this.el.getBoundingClientRect();
		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;

		let left = anchor.left + anchor.width / 2 - preview.width / 2;
		left = Math.max(
			VIEWPORT_MARGIN,
			Math.min(left, viewportWidth - preview.width - VIEWPORT_MARGIN),
		);

		const spaceBelow = viewportHeight - anchor.bottom;
		const showBelow =
			spaceBelow >= preview.height + ANCHOR_GAP ||
			spaceBelow >= anchor.top - VIEWPORT_MARGIN;
		const top = showBelow
			? Math.min(
					anchor.bottom + ANCHOR_GAP,
					viewportHeight - preview.height - VIEWPORT_MARGIN,
				)
			: Math.max(VIEWPORT_MARGIN, anchor.top - preview.height - ANCHOR_GAP);

		this.el.style.left = `${left}px`;
		this.el.style.top = `${Math.max(VIEWPORT_MARGIN, top)}px`;
		this.el.toggleClass('is-above', !showBelow);
	}

	private scheduleClose(): void {
		if (this.openTimer !== null) {
			window.clearTimeout(this.openTimer);
			this.openTimer = null;
		}
		this.cancelClose();
		this.closeTimer = window.setTimeout(() => {
			this.closeTimer = null;
			this.requestId++;
			this.el.removeClass('is-visible');
		}, CLOSE_DELAY_MS);
	}

	private cancelClose(): void {
		if (this.closeTimer !== null) {
			window.clearTimeout(this.closeTimer);
			this.closeTimer = null;
		}
	}

	private clearTimers(): void {
		if (this.openTimer !== null) {
			window.clearTimeout(this.openTimer);
			this.openTimer = null;
		}
		this.cancelClose();
	}
}
