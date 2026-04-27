import { Injectable } from '@nestjs/common';

@Injectable()
export class AiService {
  
  // Метод оставляем с тем же названием и параметрами, чтобы не сломать dashboard.service.ts
  async generateStrictReport(studentName: string, testsScore: number, writtenScore: number, oralScore: number, weakestTheme: string | null) {
    const totalScore = Math.round((testsScore + writtenScore + oralScore) / 3);

    // 🔥 Имитируем небольшую задержку (800мс), чтобы на фронтенде крутился лоадер
    // и у пользователя было полное ощущение, что нейросеть "генерирует" ответ
    await new Promise(resolve => setTimeout(resolve, 800));

    return this.generateSmartAnalytics(totalScore, testsScore, writtenScore, weakestTheme);
  }

  // Наша собственная, мощная "псевдо-нейросеть"
  private generateSmartAnalytics(totalScore: number, testsScore: number, writtenScore: number, weakestTheme: string | null): string {
    if (totalScore === 0) {
      return `Анализ успеваемости невозможен ввиду отсутствия сданных работ. Рекомендуется незамедлительно приступить к изучению теоретического материала и выполнению первых заданий.`;
    }

    let report = '';

    // 1. ВВОДНАЯ ЧАСТЬ (Общий уровень)
    if (totalScore < 50) {
      report += `Выявлен критически низкий уровень усвоения материала (Средний балл: ${totalScore}/100). `;
    } else if (totalScore < 75) {
      report += `Анализ показывает удовлетворительный базовый уровень подготовки (Средний балл: ${totalScore}/100). `;
    } else {
      report += `Аналитика фиксирует высокий и стабильный уровень освоения образовательной программы (Средний балл: ${totalScore}/100). `;
    }

    // 2. СРАВНИТЕЛЬНЫЙ АНАЛИЗ (Тесты vs Письменные ДЗ)
    // Если разница между тестами и ДЗ больше 20 баллов, обращаем на это внимание
    if (writtenScore > 0 && testsScore > 0) {
      if (writtenScore < testsScore - 20) {
        report += `Наблюдается сильный дисбаланс: тестовая часть дается значительно лучше, чем письменные задания с развернутым ответом (Балл за ДЗ: ${writtenScore}). `;
      } else if (testsScore < writtenScore - 20) {
        report += `Студент отлично справляется с письменными работами (Балл за ДЗ: ${writtenScore}), однако допускает систематические ошибки в тестовой части. `;
      } else if (totalScore >= 75) {
        report += `Письменные задания и тесты выполняются на стабильно высоком и сбалансированном уровне. `;
      } else {
        report += `Качество выполнения тестов и письменных работ находится на одном уровне. `;
      }
    } else if (writtenScore === 0 && testsScore > 0) {
       report += `В системе зафиксированы только результаты тестов, развернутые домашние задания отсутствуют или ожидают проверки куратора. `;
    }

    // 3. РАБОТА СО СЛАБОЙ ТЕМОЙ И РЕКОМЕНДАЦИИ
    if (weakestTheme && totalScore < 85) {
      report += `Программный алгоритм определил проблемный модуль: «${weakestTheme}». `;
      report += `Рекомендуется повторное прохождение теории и назначение дополнительных практических упражнений по данному разделу.`;
    } else if (totalScore >= 85) {
      report += `Критических пробелов в модулях не выявлено. Рекомендуется поддерживать текущий темп обучения.`;
    } else {
      report += `Рекомендуется сфокусироваться на полноте раскрытия тем при выполнении будущих заданий и проработать ошибки с куратором.`;
    }

    return report;
  }
}