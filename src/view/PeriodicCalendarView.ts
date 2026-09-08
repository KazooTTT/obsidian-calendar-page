import type { Moment } from 'moment';
import { ItemView, TFile, WorkspaceLeaf, type App } from 'obsidian';
import {
	PERIODICITY_LABELS,
	PERIODIC_CALENDAR_ICON,
	VIEW_TYPE_PERIODIC_CALENDAR,
} from '../constants';
import {
	isPeriodicNotesAvailable,
	readPeriodicNotesSettings,
} from '../services/ConfigReader';
import {
	getMonthlyNoteForMonth,
	getYearlyNoteForYear,
	openOrCreatePeriodicNote,
} from '../services/NoteActions';
import { NoteIndexer } from '../services/NoteIndexer';
import {
	buildDailyYearStats,
	getYearsWithDailyStats,
} from '../services/StatsAggregator';
import { buildDotCountMap, buildWordCountMap } from '../services/WordCounter';
import type PeriodicCalendarPagePlugin from '../main';
import { CalendarRenderer } from '../ui/CalendarRenderer';
import { buildDetailEntries, DetailPanel } from '../ui/DetailPanel';
import { HoverPreview } from '../ui/HoverPreview';
import { StatsRenderer } from '../ui/StatsRenderer';
import {
	showNoteContextMenu,
	showWeeklyContextMenu,
	type NoteContextMenuActions,
} from '../ui/NoteContextMenu';
import type {
	CalendarZoom,
	IndexedNotes,
	PageMode,
	PeriodicNotesSettings,
	Periodicity,
	YearStats,
} from '../types';
import {
	formatPeriodRange,
	formatYearlyRange,
	getDateUid,
	getMoment,
	YEARS_PER_PAGE,
} from '../utils/dates';

export class PeriodicCalendarView extends ItemView {
	private renderer: CalendarRenderer | null = null;
	private statsRenderer: StatsRenderer | null = null;
	private detailPanel: DetailPanel | null = null;
	private hoverPreview: HoverPreview | null = null;
	private pageMode: PageMode = 'calendar';
	private zoom: CalendarZoom = 'day';
	private displayMonth = getMoment().startOf('month');
	private selectedDate = getMoment().startOf('day');

	private notes: IndexedNotes = {
		daily: {},
		weekly: {},
		monthly: {},
		quarterly: {},
		yearly: {},
	};
	private dotCounts = new Map<string, number>();
	private yearStats = new Map<number, YearStats>();
	private periodicSettings: PeriodicNotesSettings | null = null;

	constructor(
		leaf: WorkspaceLeaf,
		private plugin: PeriodicCalendarPagePlugin,
	) {
		super(leaf);
	}

	getViewType(): string {
		return VIEW_TYPE_PERIODIC_CALENDAR;
	}

	getDisplayText(): string {
		return '日记日历';
	}

	getIcon(): string {
		return PERIODIC_CALENDAR_ICON;
	}

	async onOpen(): Promise<void> {
		const container = this.containerEl.children[1] as HTMLElement;
		container.empty();
		container.addClass('periodic-calendar-page-root');

		if (!isPeriodicNotesAvailable(this.app)) {
			container.createDiv({
				cls: 'periodic-calendar-page__error',
				text: '未检测到 Periodic Notes 插件，请先安装并启用。',
			});
			return;
		}

		const menuActions = this.createMenuActions();
		this.hoverPreview = new HoverPreview(this.app, container, this);

		this.renderer = new CalendarRenderer(container, {
			onBindPreview: (target, file, label) => {
				this.hoverPreview?.bind(target, file, label);
			},
			onSelectDate: (date, metaKey) => {
				this.selectedDate = date.startOf('day');
				if (metaKey) {
					void this.handleNavigate('daily', date);
					return;
				}
				this.refresh();
			},
			onSelectWeek: (weekStart, metaKey) => {
				this.selectedDate = weekStart.clone().startOf('day');
				if (metaKey) {
					void this.handleNavigate('weekly', weekStart);
					return;
				}
				this.refresh();
			},
			onSelectMonth: (month, metaKey) => {
				if (metaKey) {
					void this.handleNavigate('monthly', month);
					return;
				}
				this.zoom = 'day';
				this.displayMonth = month.clone().startOf('month');
				const today = getMoment().startOf('day');
				this.selectedDate = today.isSame(month, 'month')
					? today
					: month.clone().startOf('month');
				this.refresh();
			},
			onContextMenuDate: (date, event) => {
				this.selectedDate = date.startOf('day');
				this.refresh();
				showNoteContextMenu(
					this.app,
					event,
					date,
					buildDetailEntries(date, this.notes),
					menuActions,
				);
			},
			onContextMenuWeek: (weekStart, event) => {
				this.selectedDate = weekStart.clone().startOf('day');
				this.refresh();
				const uid = getDateUid(weekStart, 'weekly');
				const file = this.notes.weekly[uid];
				showWeeklyContextMenu(
					this.app,
					event,
					weekStart,
					{
						kind: 'weekly',
						label: PERIODICITY_LABELS.weekly,
						title: file?.basename ?? null,
						dateRange: null,
						exists: !!file,
						path: file?.path ?? null,
					},
					menuActions,
				);
			},
			onContextMenuMonth: (month, event) => {
				const monthEnd = month.clone().endOf('month');
				this.selectedDate = monthEnd;
				this.refresh();
				const uid = getDateUid(monthEnd, 'monthly');
				const file = this.notes.monthly[uid];
				showNoteContextMenu(
					this.app,
					event,
					monthEnd,
					[
						{
							kind: 'monthly',
							label: PERIODICITY_LABELS.monthly,
							title: file?.basename ?? null,
							dateRange: formatPeriodRange(monthEnd, 'monthly'),
							exists: !!file,
							path: file?.path ?? null,
						},
					],
					menuActions,
				);
			},
			onSelectQuarter: (quarterEnd, metaKey) => {
				this.selectedDate = quarterEnd.clone().startOf('day');
				if (metaKey) {
					void this.handleNavigate('quarterly', quarterEnd);
					return;
				}
				this.refresh();
			},
			onSelectYearly: (yearEnd, metaKey) => {
				this.selectedDate = yearEnd.clone().startOf('day');
				if (metaKey) {
					void this.handleNavigate('yearly', yearEnd);
					return;
				}
				this.refresh();
			},
			onContextMenuQuarter: (quarterEnd, event) => {
				this.selectedDate = quarterEnd.clone().startOf('day');
				this.refresh();
				const uid = getDateUid(quarterEnd, 'quarterly');
				const file = this.notes.quarterly[uid];
				showNoteContextMenu(
					this.app,
					event,
					quarterEnd,
					[
						{
							kind: 'quarterly',
							label: PERIODICITY_LABELS.quarterly,
							title: file?.basename ?? null,
							dateRange: formatPeriodRange(quarterEnd, 'quarterly'),
							exists: !!file,
							path: file?.path ?? null,
						},
					],
					menuActions,
				);
			},
			onContextMenuYearly: (yearEnd, event) => {
				this.selectedDate = yearEnd.clone().startOf('day');
				this.refresh();
				const uid = getDateUid(yearEnd, 'yearly');
				const file = this.notes.yearly[uid];
				showNoteContextMenu(
					this.app,
					event,
					yearEnd,
					[
						{
							kind: 'yearly',
							label: PERIODICITY_LABELS.yearly,
							title: file?.basename ?? null,
							dateRange: formatYearlyRange(yearEnd),
							exists: !!file,
							path: file?.path ?? null,
						},
					],
					menuActions,
				);
			},
			onSelectYear: (yearStart, metaKey) => {
				if (metaKey) {
					void this.handleNavigate('yearly', yearStart);
					return;
				}
				this.zoom = 'year';
				this.displayMonth = yearStart.clone().startOf('year');
				const today = getMoment().startOf('day');
				this.selectedDate = today.isSame(yearStart, 'year')
					? today
					: yearStart.clone().startOf('year');
				this.refresh();
			},
			onTitleClick: () => {
				if (this.zoom === 'day') {
					this.zoom = 'year';
				} else if (this.zoom === 'year') {
					this.zoom = 'years';
				}
				this.refresh();
			},
			onPageModeChange: (mode) => {
				this.setPageMode(mode);
			},
			onPrev: () => {
				if (this.zoom === 'years') {
					this.displayMonth = this.displayMonth
						.clone()
						.subtract(YEARS_PER_PAGE, 'years');
				} else {
					const unit = this.zoom === 'year' ? 'year' : 'month';
					this.displayMonth = this.displayMonth.clone().subtract(1, unit);
				}
				this.refresh();
			},
			onNext: () => {
				if (this.zoom === 'years') {
					this.displayMonth = this.displayMonth
						.clone()
						.add(YEARS_PER_PAGE, 'years');
				} else {
					const unit = this.zoom === 'year' ? 'year' : 'month';
					this.displayMonth = this.displayMonth.clone().add(1, unit);
				}
				this.refresh();
			},
			onToday: () => {
				const today = getMoment().startOf('day');
				this.pageMode = 'calendar';
				this.zoom = 'day';
				this.displayMonth = today.clone().startOf('month');
				this.selectedDate = today;
				this.refresh();
			},
			onOpenMonthly: () => {
				void this.handleOpenMonthly();
			},
			onOpenYearly: () => {
				void this.handleOpenYearly();
			},
		});

		const body = this.renderer.getElement().querySelector(
			'.periodic-calendar-page__body',
		) as HTMLElement;
		this.detailPanel = new DetailPanel(body);
		this.statsRenderer = new StatsRenderer(this.renderer.getStatsHost(), {
			onSelectMonth: (year, month) => {
				this.pageMode = 'calendar';
				this.zoom = 'day';
				this.displayMonth = getMoment()
					.year(year)
					.month(month - 1)
					.startOf('month');
				const today = getMoment().startOf('day');
				this.selectedDate =
					today.year() === year && today.month() + 1 === month
						? today
						: this.displayMonth.clone().startOf('month');
				this.refresh();
			},
		});
		this.detailPanel.setActions({
			onOpen: (path) => {
				void this.openNotePath(path);
			},
			onCreate: (kind, date) => {
				void this.handleNavigate(kind, date);
			},
			onDelete: (path) => {
				void this.handleDeleteNote(path);
			},
			onBindPreview: (target, path, label) => {
				const file = this.app.vault.getAbstractFileByPath(path);
				if (file instanceof TFile) {
					this.hoverPreview?.bind(target, file, label);
				}
			},
		});

		this.registerVaultEvents();
		await this.reindex();
	}

	async onClose(): Promise<void> {
		this.hoverPreview?.hide();
		this.renderer = null;
		this.statsRenderer = null;
		this.detailPanel = null;
		this.hoverPreview = null;
	}

	setPageMode(mode: PageMode): void {
		this.pageMode = mode;
		this.refresh();
	}

	private createMenuActions(): NoteContextMenuActions {
		return {
			onOpen: (path) => {
				void this.openNotePath(path);
			},
			onCreate: (kind, date) => {
				void this.handleNavigate(kind, date);
			},
			onDelete: (file) => {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const fm = this.app.fileManager as any;
				if (typeof fm.promptForFileDeletion === 'function') {
					fm.promptForFileDeletion(file);
				} else {
					void this.app.fileManager.promptForDeletion(file);
				}
			},
		};
	}

	private registerVaultEvents(): void {
		this.registerEvent(
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(this.app.workspace as any).on('periodic-notes:settings-updated', () => {
				void this.reindex();
			}),
		);
		const scheduleReindex = () => {
			void this.reindex();
		};
		this.registerEvent(this.app.vault.on('create', scheduleReindex));
		this.registerEvent(this.app.vault.on('delete', scheduleReindex));
		this.registerEvent(this.app.vault.on('rename', scheduleReindex));
		this.registerEvent(this.app.vault.on('modify', scheduleReindex));
	}

	private async reindex(): Promise<void> {
		this.periodicSettings = readPeriodicNotesSettings(this.app);
		const indexer = new NoteIndexer(this.app, this.periodicSettings);
		this.notes = indexer.indexAll();

		const dailyFiles = Object.values(this.notes.daily);
		const weeklyFiles = Object.values(this.notes.weekly);
		const { wordsPerDot } = this.plugin.settings;

		const [dailyDots, weeklyDots, dailyWordCounts] = await Promise.all([
			buildDotCountMap(this.app.vault, dailyFiles, wordsPerDot),
			buildDotCountMap(this.app.vault, weeklyFiles, wordsPerDot),
			buildWordCountMap(this.app.vault, dailyFiles),
		]);

		this.dotCounts = new Map([...dailyDots, ...weeklyDots]);
		this.yearStats = buildDailyYearStats(this.notes.daily, dailyWordCounts);
		this.refresh();
	}

	refreshView(): void {
		void this.reindex();
	}

	private refresh(): void {
		if (!this.renderer || !this.detailPanel) {
			return;
		}
		this.hoverPreview?.hide();

		const monthlyFile = getMonthlyNoteForMonth(
			this.notes.monthly,
			this.displayMonth,
		);
		const yearlyFile = getYearlyNoteForYear(
			this.notes.yearly,
			this.displayMonth,
		);

		this.renderer.render(
			this.pageMode,
			this.zoom,
			this.displayMonth,
			this.selectedDate,
			this.notes,
			this.dotCounts,
			this.plugin.settings.wordsPerDot,
			monthlyFile,
			yearlyFile,
		);

		if (this.pageMode === 'stats') {
			this.detailPanel.getContainer().style.display = 'none';
			const years = this.getStatsDisplayYears();
			this.renderer.updateStatsTitle(years.length);
			this.statsRenderer?.render(years, this.yearStats);
			return;
		}

		this.detailPanel.getContainer().style.display = '';
		this.detailPanel.renderMonth(
			this.displayMonth,
			this.notes,
			this.plugin.settings.showWeeklyReportsInDetail,
		);
	}

	private getStatsDisplayYears(): number[] {
		const yearsWithData = getYearsWithDailyStats(this.yearStats);
		if (yearsWithData.length > 0) {
			return yearsWithData;
		}

		const currentYear = getMoment().year();
		return [currentYear];
	}

	private async handleNavigate(
		periodicity: Periodicity,
		date: Moment,
	): Promise<void> {
		if (!this.periodicSettings) {
			this.periodicSettings = readPeriodicNotesSettings(this.app);
		}
		this.refresh();
		await openOrCreatePeriodicNote(
			this.app,
			periodicity,
			date,
			this.periodicSettings,
			this.notes[periodicity],
		);
		await this.reindex();
	}

	private async handleOpenMonthly(): Promise<void> {
		await this.handleNavigate('monthly', this.displayMonth);
	}

	private async handleOpenYearly(): Promise<void> {
		await this.handleNavigate('yearly', this.displayMonth);
	}

	private async handleDeleteNote(path: string): Promise<void> {
		const file = this.app.vault.getAbstractFileByPath(path);
		if (file instanceof TFile) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const fm = this.app.fileManager as any;
			if (typeof fm.promptForFileDeletion === 'function') {
				fm.promptForFileDeletion(file);
			} else {
				await this.app.fileManager.promptForDeletion(file);
			}
		}
	}

	private async openNotePath(path: string): Promise<void> {
		const file = this.app.vault.getAbstractFileByPath(path);
		if (file instanceof TFile) {
			await this.app.workspace.getLeaf(false).openFile(file);
		}
	}
}

export async function openPeriodicCalendarPage(
	app: App,
	options?: { pageMode?: PageMode },
): Promise<void> {
	const leaf = app.workspace.getLeaf(true);
	await leaf.setViewState({ type: VIEW_TYPE_PERIODIC_CALENDAR, active: true });
	app.workspace.revealLeaf(leaf);
	if (
		options?.pageMode &&
		leaf.view instanceof PeriodicCalendarView
	) {
		leaf.view.setPageMode(options.pageMode);
	}
}
