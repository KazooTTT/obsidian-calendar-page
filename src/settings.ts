import { App, PluginSettingTab, Setting } from 'obsidian';
import type PeriodicCalendarPagePlugin from './main';

export interface PeriodicCalendarSettings {
	wordsPerDot: number;
	showWeeklyReportsInDetail: boolean;
}

export const DEFAULT_SETTINGS: PeriodicCalendarSettings = {
	wordsPerDot: 250,
	showWeeklyReportsInDetail: false,
};

export class PeriodicCalendarSettingTab extends PluginSettingTab {
	constructor(app: App, private plugin: PeriodicCalendarPagePlugin) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createDiv({
			cls: 'periodic-calendar-page__settings-dependency',
			text: '依赖：需要先安装并启用 Periodic Notes。本插件会读取其日记 / 周报 / 月报 / 季报 / 年报配置。',
		});

		new Setting(containerEl)
			.setName('每个圆点代表字数')
			.setDesc(
				'日记字数达到该值后多显示一个圆点，最多 5 个。设为 0 则只显示一个存在标记。',
			)
			.addText((text) =>
				text
					.setPlaceholder('250')
					.setValue(String(this.plugin.settings.wordsPerDot))
					.onChange(async (value) => {
						const parsed = Number(value);
						this.plugin.settings.wordsPerDot =
							Number.isFinite(parsed) && parsed >= 0 ? parsed : 250;
						await this.plugin.saveSettings();
						this.plugin.refreshOpenViews();
					}),
			);

		new Setting(containerEl)
			.setName('在右侧显示周报')
			.setDesc('开启后，在右侧周期面板中显示当前月历包含的所有周报。')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showWeeklyReportsInDetail)
					.onChange(async (value) => {
						this.plugin.settings.showWeeklyReportsInDetail = value;
						await this.plugin.saveSettings();
						this.plugin.refreshOpenViews();
					}),
			);
	}
}
