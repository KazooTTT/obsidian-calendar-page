import type { Moment } from 'moment';
import { PERIODICITY_LABELS } from '../constants';
import type { DetailEntry, IndexedNotes, Periodicity } from '../types';
import { buildMonthGrid, formatDetailRange, getDateUid } from '../utils/dates';

const DETAIL_ORDER: Periodicity[] = [
	'daily',
	'weekly',
	'monthly',
	'quarterly',
	'yearly',
];

export interface DetailPanelActions {
	onOpen: (path: string) => void;
	onCreate: (kind: Periodicity, date: Moment) => void;
	onDelete: (path: string) => void;
	onBindPreview: (
		target: HTMLElement,
		path: string,
		label: string,
	) => void;
}

export function buildDetailEntries(
	date: Moment,
	notes: IndexedNotes,
): DetailEntry[] {
	return DETAIL_ORDER.map((kind) => {
		const uid = getDateUid(date, kind);
		const file = notes[kind][uid] ?? null;
		return {
			kind,
			label: PERIODICITY_LABELS[kind],
			title: file?.basename ?? null,
			dateRange: formatDetailRange(date, kind),
			exists: !!file,
			path: file?.path ?? null,
		};
	});
}

export function buildMonthPeriodEntries(
	month: Moment,
	notes: IndexedNotes,
	showWeeklyReports = false,
): Array<DetailEntry & { date: Moment }> {
	const periods: Array<{ kind: Periodicity; date: Moment }> =
		showWeeklyReports
			? buildMonthGrid(month).map((week) => ({
					kind: 'weekly',
					date: week[0]!,
				}))
			: [];
	periods.push({ kind: 'monthly', date: month.clone().endOf('month') });

	if ((month.month() + 1) % 3 === 0) {
		periods.push({
			kind: 'quarterly',
			date: month.clone().endOf('quarter'),
		});
	}
	if (month.month() === 11) {
		periods.push({
			kind: 'yearly',
			date: month.clone().endOf('year'),
		});
	}

	return periods.map(({ kind, date }) => {
		const file = notes[kind][getDateUid(date, kind)] ?? null;
		return {
			date,
			kind,
			label: PERIODICITY_LABELS[kind],
			title: file?.basename ?? null,
			dateRange: formatDetailRange(date, kind),
			exists: !!file,
			path: file?.path ?? null,
		};
	});
}

export class DetailPanel {
	private container: HTMLElement;
	private listEl: HTMLElement;
	private actions: DetailPanelActions | null = null;

	constructor(parent: HTMLElement) {
		this.container = parent.createDiv('periodic-calendar-page__detail');
		this.listEl = this.container.createDiv('periodic-calendar-page__detail-list');
	}

	setActions(actions: DetailPanelActions): void {
		this.actions = actions;
	}

	getContainer(): HTMLElement {
		return this.container;
	}

	renderMonth(
		month: Moment,
		notes: IndexedNotes,
		showWeeklyReports: boolean,
	): void {
		this.listEl.empty();

		const entries = buildMonthPeriodEntries(month, notes, showWeeklyReports);
		for (const entry of entries) {
			this.renderEntry(entry, entry.date);
		}
	}

	private renderEntry(entry: DetailEntry, date: Moment): void {
		const card = this.listEl.createDiv('periodic-calendar-page__detail-card');
		card.addClass(`periodic-calendar-page__detail-card--${entry.kind}`);
		if (entry.exists) {
			card.addClass('is-exists');
			if (entry.path) {
				this.actions?.onBindPreview(card, entry.path, entry.label);
			}
		} else {
			card.addClass('is-missing');
		}

		const header = card.createDiv('periodic-calendar-page__detail-card-header');
		header.createSpan({
			cls: `periodic-calendar-page__year-period-badge periodic-calendar-page__year-period-badge--${entry.kind}`,
			text: entry.label,
		});

		const body = header.createDiv('periodic-calendar-page__detail-card-body');
		body.createDiv({
			cls: 'periodic-calendar-page__detail-card-title',
			text: entry.exists
				? entry.title ?? '—'
				: entry.kind === 'weekly'
					? `第 ${date.isoWeek()} 周 · 未创建`
					: '未创建',
		});
		if (entry.dateRange) {
			body.createDiv({
				cls: 'periodic-calendar-page__detail-card-range',
				text: `日期范围：${entry.dateRange}`,
			});
		}

		header.createSpan({
			cls: `periodic-calendar-page__year-period-status${entry.exists ? ' is-ok' : ''}`,
			text: entry.exists ? '✓' : '—',
		});

		const actionBar = card.createDiv({ cls: 'periodic-calendar-page__detail-card-actions' });

		if (entry.exists && entry.path) {
			this.createActionButton(actionBar, '打开', () => {
				this.actions?.onOpen(entry.path!);
			});
			this.createActionButton(actionBar, '删除', () => {
				this.actions?.onDelete(entry.path!);
			}, true);
		} else {
			this.createActionButton(actionBar, '创建', () => {
				this.actions?.onCreate(entry.kind, date);
			});
		}
	}

	private createActionButton(
		parent: HTMLElement,
		label: string,
		onClick: () => void,
		isDanger = false,
	): void {
		const btn = parent.createEl('button', {
			cls: `periodic-calendar-page__detail-action${isDanger ? ' is-danger' : ''}`,
			text: label,
		});
		btn.addEventListener('click', (event) => {
			event.stopPropagation();
			onClick();
		});
	}
}
