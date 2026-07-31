import type { Moment } from 'moment';
import type { TFile } from 'obsidian';
import type { CalendarZoom, IndexedNotes, PageMode } from '../types';
import {
	buildMonthGrid,
	countDailyNotesInMonth,
	formatPeriodRange,
	formatYearlyRange,
	formatYearsPageTitle,
	getDateUid,
	getQuarterEndForYear,
	getYearsPageStart,
	YEARS_PER_PAGE,
	isLastDayOfMonth,
	isLastDayOfQuarter,
	isLastDayOfYear,
} from '../utils/dates';

export interface CalendarRendererOptions {
	onBindPreview: (
		target: HTMLElement,
		file: TFile,
		label: string,
	) => void;
	onSelectDate: (date: Moment, metaKey: boolean) => void;
	onSelectWeek: (weekStart: Moment, metaKey: boolean) => void;
	onSelectMonth: (month: Moment, metaKey: boolean) => void;
	onSelectQuarter: (quarterEnd: Moment, metaKey: boolean) => void;
	onSelectYearly: (yearEnd: Moment, metaKey: boolean) => void;
	onSelectYear: (yearStart: Moment, metaKey: boolean) => void;
	onContextMenuDate: (date: Moment, event: MouseEvent) => void;
	onContextMenuWeek: (weekStart: Moment, event: MouseEvent) => void;
	onContextMenuMonth: (month: Moment, event: MouseEvent) => void;
	onContextMenuQuarter: (quarterEnd: Moment, event: MouseEvent) => void;
	onContextMenuYearly: (yearEnd: Moment, event: MouseEvent) => void;
	onTitleClick: () => void;
	onPageModeChange: (mode: PageMode) => void;
	onPrev: () => void;
	onNext: () => void;
	onToday: () => void;
	onOpenMonthly: () => void;
	onOpenYearly: () => void;
}

export class CalendarRenderer {
	private root: HTMLElement;
	private headerEl: HTMLElement;
	private titleEl: HTMLElement;
	private monthlyBtn: HTMLButtonElement;
	private calendarWrap: HTMLElement;
	private statsWrap: HTMLElement;
	private gridHost: HTMLElement;
	private calendarModeTab: HTMLElement;
	private statsModeTab: HTMLElement;
	private bodyEl: HTMLElement;
	private navEl: HTMLElement;
	private prevNavBtn: HTMLButtonElement;
	private nextNavBtn: HTMLButtonElement;
	private currentZoom: CalendarZoom = 'day';
	private currentPageMode: PageMode = 'calendar';

	constructor(parent: HTMLElement, private options: CalendarRendererOptions) {
		this.root = parent.createDiv('periodic-calendar-page');

		const modeBar = this.root.createDiv('periodic-calendar-page__mode-bar');
		const modeSwitch = modeBar.createDiv('periodic-calendar-page__mode-switch');
		modeSwitch.setAttr('role', 'tablist');
		modeSwitch.setAttr('aria-label', '视图切换');
		this.calendarModeTab = modeSwitch.createDiv({
			cls: 'periodic-calendar-page__mode-tab is-active',
			text: '日历',
		});
		this.calendarModeTab.setAttr('role', 'tab');
		this.calendarModeTab.setAttr('tabindex', '0');
		this.calendarModeTab.setAttr('aria-selected', 'true');
		this.statsModeTab = modeSwitch.createDiv({
			cls: 'periodic-calendar-page__mode-tab',
			text: '统计',
		});
		this.statsModeTab.setAttr('role', 'tab');
		this.statsModeTab.setAttr('tabindex', '0');
		this.statsModeTab.setAttr('aria-selected', 'false');
		this.bindModeTab(this.calendarModeTab, 'calendar');
		this.bindModeTab(this.statsModeTab, 'stats');

		this.headerEl = this.root.createDiv('periodic-calendar-page__header');
		const titleRow = this.headerEl.createDiv('periodic-calendar-page__title-row');
		this.titleEl = titleRow.createDiv('periodic-calendar-page__title');
		this.titleEl.addEventListener('click', () => {
			if (this.currentZoom === 'day' || this.currentZoom === 'year') {
				this.options.onTitleClick();
			}
		});

		this.monthlyBtn = titleRow.createEl('button', {
			cls: 'periodic-calendar-page__monthly-btn',
		});
		this.monthlyBtn.addEventListener('click', (event) => {
			event.stopPropagation();
			if (this.currentZoom === 'year') {
				this.options.onOpenYearly();
			} else {
				this.options.onOpenMonthly();
			}
		});

		this.navEl = this.headerEl.createDiv('periodic-calendar-page__nav');
		this.prevNavBtn = this.createNavButton(this.navEl, '‹', this.options.onPrev);
		this.createNavButton(this.navEl, '今天', this.options.onToday);
		this.nextNavBtn = this.createNavButton(this.navEl, '›', this.options.onNext);

		this.bodyEl = this.root.createDiv('periodic-calendar-page__body');
		const body = this.bodyEl;
		this.calendarWrap = body.createDiv('periodic-calendar-page__calendar-wrap');
		this.gridHost = this.calendarWrap.createDiv('periodic-calendar-page__grid-host');
		this.statsWrap = body.createDiv('periodic-calendar-page__stats-wrap');
	}

	getElement(): HTMLElement {
		return this.root;
	}

	getStatsHost(): HTMLElement {
		return this.statsWrap;
	}

	getBodyElement(): HTMLElement {
		return this.root.querySelector(
			'.periodic-calendar-page__body',
		) as HTMLElement;
	}

	private createNavButton(
		parent: HTMLElement,
		label: string,
		onClick: () => void,
	): HTMLButtonElement {
		const btn = parent.createEl('button', {
			cls: 'periodic-calendar-page__nav-btn',
			text: label,
		});
		btn.addEventListener('click', onClick);
		return btn;
	}

	render(
		pageMode: PageMode,
		zoom: CalendarZoom,
		displayMonth: Moment,
		selectedDate: Moment,
		notes: IndexedNotes,
		dotCounts: Map<string, number>,
		wordsPerDot: number,
		monthlyFile: TFile | null,
		yearlyFile: TFile | null,
	): void {
		this.currentPageMode = pageMode;
		this.applyPageMode(pageMode);

		if (pageMode === 'stats') {
			this.gridHost.empty();
			this.updateStatsHeader();
			this.setNavMode('stats');
			return;
		}

		this.setNavMode('calendar');

		this.currentZoom = zoom;
		this.gridHost.empty();
		this.updateTitle(zoom, displayMonth);
		this.updateHeaderButton(zoom, monthlyFile, yearlyFile);

		if (zoom === 'years') {
			this.renderYearsView(displayMonth, selectedDate, notes);
		} else if (zoom === 'year') {
			this.renderYearView(displayMonth, selectedDate, notes);
		} else {
			this.renderDayView(
				displayMonth,
				selectedDate,
				notes,
				dotCounts,
				wordsPerDot,
			);
		}

		this.renderLegend(wordsPerDot, zoom);
	}

	private applyPageMode(pageMode: PageMode): void {
		const isCalendar = pageMode === 'calendar';
		this.calendarModeTab.toggleClass('is-active', isCalendar);
		this.statsModeTab.toggleClass('is-active', !isCalendar);
		this.calendarModeTab.setAttr('aria-selected', String(isCalendar));
		this.statsModeTab.setAttr('aria-selected', String(!isCalendar));
		this.bodyEl.toggleClass(
			'periodic-calendar-page__body--stats',
			pageMode === 'stats',
		);
		this.calendarWrap.style.display = pageMode === 'calendar' ? '' : 'none';
		this.statsWrap.style.display = pageMode === 'stats' ? '' : 'none';
	}

	private bindModeTab(tab: HTMLElement, mode: PageMode): void {
		const activate = () => {
			this.options.onPageModeChange(mode);
		};
		tab.addEventListener('click', activate);
		tab.addEventListener('keydown', (event) => {
			if (event.key === 'Enter' || event.key === ' ') {
				event.preventDefault();
				activate();
			}
		});
	}

	private setNavMode(mode: 'calendar' | 'stats'): void {
		this.navEl.style.display = '';
		const hideArrows = mode === 'stats';
		this.prevNavBtn.style.display = hideArrows ? 'none' : '';
		this.nextNavBtn.style.display = hideArrows ? 'none' : '';
	}

	updateStatsTitle(yearCount: number): void {
		this.titleEl.setText(
			yearCount > 0 ? `记录统计 · ${yearCount} 年` : '记录统计',
		);
	}

	private updateStatsHeader(): void {
		this.updateStatsTitle(0);
		this.titleEl.removeClass('is-clickable');
		this.titleEl.removeAttribute('title');
		this.monthlyBtn.style.display = 'none';
	}

	private updateTitle(zoom: CalendarZoom, displayMonth: Moment): void {
		this.titleEl.removeClass('is-clickable');
		if (zoom === 'years') {
			const startYear = getYearsPageStart(displayMonth.year());
			this.titleEl.setText(formatYearsPageTitle(startYear));
			this.titleEl.removeAttribute('title');
		} else if (zoom === 'year') {
			this.titleEl.setText(displayMonth.format('YYYY年'));
			this.titleEl.addClass('is-clickable');
			this.titleEl.setAttr('title', '点击查看多年年报');
		} else {
			this.titleEl.setText(displayMonth.format('YYYY年M月'));
			this.titleEl.addClass('is-clickable');
			this.titleEl.setAttr('title', '点击查看年视图');
		}
	}

	private updateHeaderButton(
		zoom: CalendarZoom,
		monthlyFile: TFile | null,
		yearlyFile: TFile | null,
	): void {
		this.monthlyBtn.removeClass('is-exists', 'is-missing');
		this.monthlyBtn.style.display = zoom === 'years' ? 'none' : '';
		if (this.currentPageMode === 'stats') {
			this.monthlyBtn.style.display = 'none';
		}
		if (zoom === 'year') {
			if (yearlyFile) {
				this.monthlyBtn.addClass('is-exists');
				this.monthlyBtn.setText('年报 ✓');
				this.monthlyBtn.setAttr('title', `打开年报：${yearlyFile.basename}`);
			} else {
				this.monthlyBtn.addClass('is-missing');
				this.monthlyBtn.setText('+ 年报');
				this.monthlyBtn.setAttr('title', '创建或打开本年年报');
			}
			return;
		}

		if (monthlyFile) {
			this.monthlyBtn.addClass('is-exists');
			this.monthlyBtn.setText('月报 ✓');
			this.monthlyBtn.setAttr('title', `打开月报：${monthlyFile.basename}`);
		} else {
			this.monthlyBtn.addClass('is-missing');
			this.monthlyBtn.setText('+ 月报');
			this.monthlyBtn.setAttr('title', '创建或打开本月月报');
		}
	}

	private renderDayView(
		displayMonth: Moment,
		selectedDate: Moment,
		notes: IndexedNotes,
		dotCounts: Map<string, number>,
		wordsPerDot: number,
	): void {
		const dayLayout = this.gridHost.createDiv('periodic-calendar-page__day-layout');
		const tableEl = dayLayout.createEl('table', {
			cls: 'periodic-calendar-page__calendar',
		});

		const thead = tableEl.createEl('thead');
		const headRow = thead.createEl('tr');
		headRow.createEl('th', { cls: 'week-col', text: 'w' });
		for (const day of ['一', '二', '三', '四', '五', '六', '日']) {
			headRow.createEl('th', { text: day });
		}

		const tbody = tableEl.createEl('tbody');
		const weeks = buildMonthGrid(displayMonth);
		const today = window.moment().startOf('day');

		for (const week of weeks) {
			const tr = tbody.createEl('tr');
			const weekStart = week[0]!;
			const weekUid = getDateUid(weekStart, 'weekly');
			const weeklyFile = notes.weekly[weekUid];

			const weekTd = tr.createEl('td');
			const weekCell = weekTd.createDiv('periodic-calendar-page__week-num');
			weekCell.setText(String(weekStart.isoWeek()));
			if (weeklyFile) {
				this.appendWordDots(weekCell, weeklyFile, dotCounts, wordsPerDot, 'weekly');
				this.options.onBindPreview(weekCell, weeklyFile, '周报');
			}
			weekCell.addEventListener('click', (event) => {
				this.options.onSelectWeek(weekStart, this.isNavigateClick(event));
			});
			weekCell.addEventListener('contextmenu', (event) => {
				event.preventDefault();
				this.options.onContextMenuWeek(weekStart, event);
			});

			for (const day of week) {
				const td = tr.createEl('td');
				const cell = td.createDiv('periodic-calendar-page__day');
				if (!day.isSame(displayMonth, 'month')) {
					cell.addClass('is-adjacent');
				}
				if (day.isSame(today, 'day')) {
					cell.addClass('is-today');
				}
				if (day.isSame(selectedDate, 'day')) {
					cell.addClass('is-selected');
				}

				cell.createDiv({
					cls: 'periodic-calendar-page__day-num',
					text: String(day.date()),
				});

				const markers = cell.createDiv('periodic-calendar-page__markers');
				const dailyFile = notes.daily[getDateUid(day, 'daily')];
				if (dailyFile) {
					this.appendWordDots(markers, dailyFile, dotCounts, wordsPerDot, 'daily');
					this.options.onBindPreview(cell, dailyFile, '日记');
				}
				if (isLastDayOfMonth(day) && notes.monthly[getDateUid(day, 'monthly')]) {
					markers.createDiv(
						'periodic-calendar-page__marker periodic-calendar-page__marker--monthly',
					);
				}
				if (isLastDayOfQuarter(day) && notes.quarterly[getDateUid(day, 'quarterly')]) {
					markers.createDiv(
						'periodic-calendar-page__marker periodic-calendar-page__marker--quarterly',
					);
				}
				if (isLastDayOfYear(day) && notes.yearly[getDateUid(day, 'yearly')]) {
					markers.createDiv(
						'periodic-calendar-page__marker periodic-calendar-page__marker--yearly',
					);
				}

				cell.addEventListener('click', (event) => {
					this.options.onSelectDate(day.clone(), this.isNavigateClick(event));
				});
				cell.addEventListener('contextmenu', (event) => {
					event.preventDefault();
					this.options.onContextMenuDate(day.clone(), event);
				});
			}
		}
	}

	private renderYearsView(
		displayMonth: Moment,
		selectedDate: Moment,
		notes: IndexedNotes,
	): void {
		const today = window.moment().startOf('day');
		const startYear = getYearsPageStart(displayMonth.year());
		const layout = this.gridHost.createDiv('periodic-calendar-page__years-layout');
		const grid = layout.createDiv('periodic-calendar-page__years-grid');

		for (let offset = 0; offset < YEARS_PER_PAGE; offset++) {
			const year = startYear + offset;
			const yearStart = window.moment().year(year).startOf('year');
			const yearEnd = yearStart.clone().endOf('year');
			const yearlyFile = notes.yearly[getDateUid(yearEnd, 'yearly')];

			const tile = grid.createDiv('periodic-calendar-page__year-tile');
			if (yearlyFile) {
				tile.addClass('is-exists');
			}
			if (yearStart.isSame(today, 'year')) {
				tile.addClass('is-current-year');
			}
			if (selectedDate.isSame(yearStart, 'year')) {
				tile.addClass('is-selected-year');
			}

			tile.createDiv({
				cls: 'periodic-calendar-page__year-tile-year',
				text: `${year}年`,
			});
			if (yearlyFile) {
				this.options.onBindPreview(tile, yearlyFile, '年报');
			}

			const meta = tile.createDiv('periodic-calendar-page__year-tile-meta');
			meta.createSpan({
				cls: 'periodic-calendar-page__year-period-badge periodic-calendar-page__year-period-badge--yearly',
				text: '年报',
			});
			meta.createSpan({
				cls: 'periodic-calendar-page__year-tile-status',
				text: yearlyFile ? '✓' : '—',
			});

			tile.createDiv({
				cls: 'periodic-calendar-page__year-tile-name',
				text: yearlyFile?.basename ?? '未创建',
			});
			tile.createDiv({
				cls: 'periodic-calendar-page__year-tile-range',
				text: formatYearlyRange(yearEnd),
			});

			tile.addEventListener('click', (event) => {
				this.options.onSelectYear(yearStart.clone(), this.isNavigateClick(event));
			});
			tile.addEventListener('contextmenu', (event) => {
				event.preventDefault();
				this.options.onContextMenuYearly(yearEnd.clone(), event);
			});
		}
	}

	private renderYearView(
		displayMonth: Moment,
		selectedDate: Moment,
		notes: IndexedNotes,
	): void {
		const year = displayMonth.year();
		const today = window.moment().startOf('day');
		const yearEnd = displayMonth.clone().endOf('year');
		const yearlyFile = notes.yearly[getDateUid(yearEnd, 'yearly')];

		const layout = this.gridHost.createDiv('periodic-calendar-page__year-layout');

		const yearlyCard = layout.createDiv('periodic-calendar-page__year-period-card');
		yearlyCard.addClass('periodic-calendar-page__year-period-card--yearly');
		if (yearlyFile) {
			yearlyCard.addClass('is-exists');
		}
		if (selectedDate.isSame(yearEnd, 'day')) {
			yearlyCard.addClass('is-selected-period');
		}

		const yearlyHeader = yearlyCard.createDiv('periodic-calendar-page__year-period-header');
		yearlyHeader.createSpan({
			cls: 'periodic-calendar-page__year-period-badge periodic-calendar-page__year-period-badge--yearly',
			text: '年报',
		});
		yearlyHeader.createSpan({
			cls: 'periodic-calendar-page__year-period-title',
			text: yearlyFile?.basename ?? '未创建',
		});
		yearlyHeader.createSpan({
			cls: `periodic-calendar-page__year-period-status${yearlyFile ? ' is-ok' : ''}`,
			text: yearlyFile ? '✓' : '—',
		});
		yearlyCard.createDiv({
			cls: 'periodic-calendar-page__year-period-range',
			text: `日期范围：${formatYearlyRange(yearEnd)}`,
		});
		if (yearlyFile) {
			this.options.onBindPreview(yearlyCard, yearlyFile, '年报');
		}

		yearlyCard.addEventListener('click', (event) => {
			this.options.onSelectYearly(yearEnd.clone(), this.isNavigateClick(event));
		});
		yearlyCard.addEventListener('contextmenu', (event) => {
			event.preventDefault();
			this.options.onContextMenuYearly(yearEnd.clone(), event);
		});

		const quarterGrid = layout.createDiv('periodic-calendar-page__year-quarter-grid');

		for (let quarterIndex = 0; quarterIndex < 4; quarterIndex++) {
			const quarterEnd = getQuarterEndForYear(year, quarterIndex);
			const quarterlyFile = notes.quarterly[getDateUid(quarterEnd, 'quarterly')];
			const quarterLabel = `Q${quarterIndex + 1}`;
			const monthLabels = [
				quarterIndex * 3 + 1,
				quarterIndex * 3 + 2,
				quarterIndex * 3 + 3,
			];

			const quarterGroup = quarterGrid.createDiv(
				'periodic-calendar-page__year-quarter-group',
			);
			if (quarterlyFile) {
				quarterGroup.addClass('is-exists');
			}
			if (selectedDate.isSame(quarterEnd, 'quarter')) {
				quarterGroup.addClass('is-selected-period');
			}

			const quarterBody = quarterGroup.createDiv(
				'periodic-calendar-page__year-quarter-body',
			);
			for (let offset = 0; offset < 3; offset++) {
				const month = window
					.moment()
					.year(year)
					.month(quarterIndex * 3 + offset)
					.startOf('month');
				this.renderYearMonthCell(
					quarterBody,
					month,
					selectedDate,
					today,
					notes,
					true,
				);
			}

			const quarterFoot = quarterGroup.createDiv(
				'periodic-calendar-page__year-quarter-foot',
			);
			quarterFoot.createSpan({
				cls: 'periodic-calendar-page__year-period-badge periodic-calendar-page__year-period-badge--quarterly',
				text: '季报',
			});
			if (quarterlyFile) {
				this.options.onBindPreview(quarterFoot, quarterlyFile, '季报');
			}

			const footMain = quarterFoot.createDiv(
				'periodic-calendar-page__year-quarter-foot-main',
			);
			footMain.createSpan({
				cls: 'periodic-calendar-page__year-quarter-label',
				text: `${quarterLabel} · ${monthLabels[0]}-${monthLabels[2]}月`,
			});
			footMain.createSpan({
				cls: 'periodic-calendar-page__year-quarter-meta',
				text: `${quarterlyFile?.basename ?? '未创建'} · ${formatPeriodRange(quarterEnd, 'quarterly')}`,
			});

			quarterFoot.createSpan({
				cls: `periodic-calendar-page__year-period-status${quarterlyFile ? ' is-ok' : ''}`,
				text: quarterlyFile ? '✓' : '—',
			});

			quarterFoot.addEventListener('click', (event) => {
				this.options.onSelectQuarter(quarterEnd.clone(), this.isNavigateClick(event));
			});
			quarterFoot.addEventListener('contextmenu', (event) => {
				event.preventDefault();
				this.options.onContextMenuQuarter(quarterEnd.clone(), event);
			});
		}
	}

	private renderYearMonthCell(
		parent: HTMLElement,
		month: Moment,
		selectedDate: Moment,
		today: Moment,
		notes: IndexedNotes,
		grouped = false,
	): void {
		const monthEnd = month.clone().endOf('month');
		const dailyCount = countDailyNotesInMonth(notes, month);
		const hasMonthly = !!notes.monthly[getDateUid(monthEnd, 'monthly')];
		const monthlyFile = notes.monthly[getDateUid(monthEnd, 'monthly')];

		const cell = parent.createDiv('periodic-calendar-page__year-month');
		if (grouped) {
			cell.addClass('periodic-calendar-page__year-month--grouped');
		}
		if (month.isSame(today, 'month')) {
			cell.addClass('is-current-month');
		}
		if (month.isSame(selectedDate, 'month')) {
			cell.addClass('is-selected-month');
		}

		cell.createDiv({
			cls: 'periodic-calendar-page__year-month-name',
			text: month.format('M月'),
		});
		cell.createDiv({
			cls: 'periodic-calendar-page__year-month-stats',
			text: dailyCount > 0 ? `${dailyCount} 篇日记` : '暂无日记',
		});

		if (hasMonthly) {
			const markers = cell.createDiv('periodic-calendar-page__markers');
			markers.createDiv(
				'periodic-calendar-page__marker periodic-calendar-page__marker--monthly',
			);
			this.options.onBindPreview(cell, monthlyFile!, '月报');
		}

		cell.addEventListener('click', (event) => {
			event.stopPropagation();
			this.options.onSelectMonth(month.clone(), this.isNavigateClick(event));
		});
		cell.addEventListener('contextmenu', (event) => {
			event.preventDefault();
			event.stopPropagation();
			this.options.onContextMenuMonth(month.clone(), event);
		});
	}

	private appendWordDots(
		parent: HTMLElement,
		file: TFile,
		dotCounts: Map<string, number>,
		wordsPerDot: number,
		kind: 'daily' | 'weekly',
	): void {
		const markers =
			parent.querySelector('.periodic-calendar-page__markers') ??
			parent.createDiv('periodic-calendar-page__markers');

		const count = wordsPerDot > 0 ? (dotCounts.get(file.path) ?? 1) : 1;
		for (let i = 0; i < count; i++) {
			markers.createDiv(
				`periodic-calendar-page__marker periodic-calendar-page__marker--${kind} periodic-calendar-page__marker--filled`,
			);
		}
	}

	private renderLegend(wordsPerDot: number, zoom: CalendarZoom): void {
		let legend = this.calendarWrap.querySelector('.periodic-calendar-page__legend');
		if (!legend) {
			legend = this.calendarWrap.createDiv('periodic-calendar-page__legend');
		} else {
			legend.empty();
		}

		const items = [
			['daily', '日记'],
			['weekly', '周报'],
			['monthly', '月报'],
			['quarterly', '季报'],
			['yearly', '年报'],
		] as const;

		for (const [kind, label] of items) {
			const item = legend.createDiv('periodic-calendar-page__legend-item');
			item.createDiv(`periodic-calendar-page__marker periodic-calendar-page__marker--${kind}`);
			item.createSpan({ text: label });
		}

		const zoomHints: Record<CalendarZoom, string> = {
			day: '点击标题查看年视图',
			year: '点击标题查看多年年报 · 点击年份格进入该年',
			years: '点击年份进入年视图',
		};

		const hints = [
			zoomHints[zoom],
			zoom === 'year' ? '点击季度底栏或月份进入详情' : null,
			'悬浮已有笔记：预览内容',
			wordsPerDot > 0 && zoom === 'day'
				? `日记圆点：每 ${wordsPerDot} 字一个，最多 5 个`
				: null,
			'⌘/Ctrl+点击：打开笔记 · 右键：更多操作',
		].filter(Boolean);

		legend.createSpan({
			cls: 'periodic-calendar-page__legend-hint',
			text: hints.join(' · '),
		});
	}

	private isNavigateClick(event: MouseEvent): boolean {
		return event.metaKey || event.ctrlKey;
	}
}
