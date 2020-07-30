import { action, computed, runInAction, trace } from "mobx";
import binarySearch from "terriajs-cesium/Source/Core/binarySearch";
import JulianDate from "terriajs-cesium/Source/Core/JulianDate";
import { ChartPoint } from "../Charts/ChartData";
import getChartColorForId from "../Charts/getChartColorForId";
import Constructor from "../Core/Constructor";
import filterOutUndefined from "../Core/filterOutUndefined";
import TerriaError from "../Core/TerriaError";
import { calculateDomain, ChartItem } from "../Models/Chartable";
import CommonStrata from "../Models/CommonStrata";
import Model from "../Models/Model";
import DiscretelyTimeVaryingTraits from "../Traits/DiscretelyTimeVaryingTraits";
import TimeVarying from "./TimeVarying";
import { uniq } from "lodash-es";
import isDefined from "../Core/isDefined";

type DiscretelyTimeVarying = Model<DiscretelyTimeVaryingTraits>;

export interface AsJulian {
  time: JulianDate;
  tag: string;
}

function DiscretelyTimeVaryingMixin<
  T extends Constructor<DiscretelyTimeVarying>
>(Base: T) {
  abstract class DiscretelyTimeVaryingMixin extends Base
    implements TimeVarying {
    abstract get discreteTimes():
      | { time: string; tag: string | undefined }[]
      | undefined;

    @computed
    get currentTime(): string | undefined {
      const time = super.currentTime;
      if (time === undefined) {
        if (this.initialTimeSource === "now") {
          return JulianDate.toIso8601(JulianDate.now());
        } else if (this.initialTimeSource === "start") {
          return this.startTime;
        } else if (this.initialTimeSource === "stop") {
          return this.stopTime;
        } else if (this.initialTimeSource === "none") {
          return undefined;
        } else {
          throw new TerriaError({
            sender: this,
            title: "Invalid initialTime value",
            message:
              "The `initialTime` property has an invalid value: `" +
              this.initialTimeSource +
              "`."
          });
        }
      }
      return time;
    }

    @computed({ equals: JulianDate.equals })
    get currentTimeAsJulianDate() {
      return toJulianDate(this.currentTime);
    }

    @computed({ equals: JulianDate.equals })
    get startTimeAsJulianDate(): JulianDate | undefined {
      return toJulianDate(this.startTime);
    }

    @computed({ equals: JulianDate.equals })
    get stopTimeAsJulianDate(): JulianDate | undefined {
      return toJulianDate(this.stopTime);
    }

    @computed
    get objectifiedDates(): ObjectifiedDates {
      if (!isDefined(this.discreteTimesAsSortedJulianDates)) {
        return { indice: [], dates: [] };
      }

      const jsDates = this.discreteTimesAsSortedJulianDates.map(julianDate =>
        JulianDate.toDate(julianDate.time)
      );

      return objectifyDates(jsDates);
    }

    @computed
    get discreteTimesAsSortedJulianDates(): AsJulian[] | undefined {
      const discreteTimes = this.discreteTimes;
      if (discreteTimes === undefined) {
        return undefined;
      }

      const asJulian: AsJulian[] = [];
      for (let i = 0; i < discreteTimes.length; i++) {
        const dt = discreteTimes[i];
        try {
          if (dt.time !== undefined) {
            const time = JulianDate.fromIso8601(dt.time);
            asJulian.push({
              time,
              tag: dt.tag !== undefined ? dt.tag : dt.time
            });
          }
        } catch {}
      }
      asJulian.sort((a, b) => JulianDate.compare(a.time, b.time));
      return asJulian;
    }

    getDiscreteTimeIndex(time: JulianDate): number | undefined {
      const discreteTimes = this.discreteTimesAsSortedJulianDates;
      if (discreteTimes === undefined || discreteTimes.length === 0) {
        return undefined;
      }

      const exactIndex = binarySearch(
        discreteTimes,
        time,
        (candidate, currentTime) =>
          JulianDate.compare(candidate.time, currentTime)
      );
      if (exactIndex >= 0) {
        return exactIndex;
      }

      const nextIndex = ~exactIndex;
      if (nextIndex === 0 || this.fromContinuous === "next") {
        // Before the first, or we want the next time no matter which is closest
        return nextIndex;
      } else if (
        nextIndex === discreteTimes.length ||
        this.fromContinuous === "previous"
      ) {
        // After the last, or we want the previous time no matter which is closest
        return nextIndex - 1;
      } else {
        const previousTime = discreteTimes[nextIndex - 1].time;
        const nextTime = discreteTimes[nextIndex].time;

        const timeFromPrevious = JulianDate.secondsDifference(
          time,
          previousTime
        );
        const timeToNext = JulianDate.secondsDifference(nextTime, time);
        if (timeToNext > timeFromPrevious) {
          return nextIndex - 1;
        } else {
          return nextIndex;
        }
      }
    }

    @computed
    get currentDiscreteTimeIndex(): number | undefined {
      return (
        this.currentTimeAsJulianDate &&
        this.getDiscreteTimeIndex(this.currentTimeAsJulianDate)
      );
    }

    @computed
    get nextDiscreteTimeIndex(): number | undefined {
      const index = this.currentDiscreteTimeIndex;
      if (
        index === undefined ||
        index === this.discreteTimesAsSortedJulianDates!.length - 1
      ) {
        return undefined;
      }
      return index + 1;
    }

    @computed
    get previousDiscreteTimeIndex(): number | undefined {
      const index = this.currentDiscreteTimeIndex;
      if (index === undefined || index === 0) {
        return undefined;
      }
      return index - 1;
    }

    @computed({ equals: JulianDate.equals })
    get currentDiscreteJulianDate() {
      const index = this.currentDiscreteTimeIndex;
      return index === undefined
        ? undefined
        : this.discreteTimesAsSortedJulianDates![index].time;
    }

    @computed
    get currentDiscreteTimeTag() {
      const index = this.currentDiscreteTimeIndex;
      return index === undefined
        ? undefined
        : this.discreteTimesAsSortedJulianDates![index].tag;
    }

    @computed
    get previousDiscreteTimeTag() {
      const index = this.previousDiscreteTimeIndex;
      return index === undefined
        ? undefined
        : this.discreteTimesAsSortedJulianDates![index].tag;
    }

    @computed
    get nextDiscreteTimeTag() {
      const index = this.nextDiscreteTimeIndex;
      return index === undefined
        ? undefined
        : this.discreteTimesAsSortedJulianDates![index].tag;
    }

    @computed
    get isPreviousDiscreteTimeAvailable(): boolean {
      return this.previousDiscreteTimeIndex !== undefined;
    }

    @computed
    get isNextDiscreteTimeAvailable(): boolean {
      return this.nextDiscreteTimeIndex !== undefined;
    }

    @computed
    get startTime(): string | undefined {
      const time = super.startTime;
      if (
        time === undefined &&
        this.discreteTimesAsSortedJulianDates &&
        this.discreteTimesAsSortedJulianDates.length > 0
      ) {
        return JulianDate.toIso8601(
          this.discreteTimesAsSortedJulianDates[0].time
        );
      }
      return time;
    }

    @computed
    get stopTime(): string | undefined {
      const time = super.stopTime;
      if (
        time === undefined &&
        this.discreteTimesAsSortedJulianDates &&
        this.discreteTimesAsSortedJulianDates.length > 0
      ) {
        return JulianDate.toIso8601(
          this.discreteTimesAsSortedJulianDates[
            this.discreteTimesAsSortedJulianDates.length - 1
          ].time
        );
      }
      return time;
    }

    @action
    moveToPreviousDiscreteTime(stratumId: string) {
      const index = this.previousDiscreteTimeIndex;
      if (index === undefined) {
        return;
      }
      this.setTrait(
        stratumId,
        "currentTime",
        JulianDate.toIso8601(this.discreteTimesAsSortedJulianDates![index].time)
      );
    }

    @action
    moveToNextDiscreteTime(stratumId: string) {
      const index = this.nextDiscreteTimeIndex;
      if (index === undefined) {
        return;
      }
      this.setTrait(
        stratumId,
        "currentTime",
        JulianDate.toIso8601(this.discreteTimesAsSortedJulianDates![index].time)
      );
    }

    @computed get chartItems(): ChartItem[] {
      if (!this.showInChartPanel || !this.discreteTimesAsSortedJulianDates)
        return [];
      const points: ChartPoint[] = this.discreteTimesAsSortedJulianDates.map(
        dt => ({
          x: JulianDate.toDate(dt.time),
          y: 0.5,
          isSelected:
            this.currentDiscreteJulianDate &&
            this.currentDiscreteJulianDate.equals(dt.time)
        })
      );

      const colorId = `color-${this.name}`;
      return [
        {
          item: this,
          name: this.name || "",
          categoryName: this.name,
          key: `key${this.uniqueId}-${this.name}`,
          type: this.chartType || "momentLines",
          xAxis: { scale: "time" },
          points,
          domain: { ...calculateDomain(points), y: [0, 1] },
          showInChartPanel: this.show && this.showInChartPanel,
          isSelectedInWorkbench: this.showInChartPanel,
          updateIsSelectedInWorkbench: (isSelected: boolean) => {
            runInAction(() => {
              this.setTrait(CommonStrata.user, "showInChartPanel", isSelected);
            });
          },
          getColor: () => {
            return getChartColorForId(colorId);
          },
          onClick: (point: any) => {
            runInAction(() => {
              this.setTrait(
                CommonStrata.user,
                "currentTime",
                point.x.toISOString()
              );
            });
          }
        }
      ];
    }

    loadChartItems() {
      return Promise.resolve();
    }
  }

  return DiscretelyTimeVaryingMixin;
}

namespace DiscretelyTimeVaryingMixin {
  export type Instance = InstanceType<
    ReturnType<typeof DiscretelyTimeVaryingMixin>
  >;
}

export default DiscretelyTimeVaryingMixin;

function toJulianDate(time: string | undefined): JulianDate | undefined {
  if (time === undefined) {
    return undefined;
  }
  return JulianDate.fromIso8601(time);
}

type DatesObject<T> = {
  [key: number]: T;
  dates: Date[];
  indice: number[];
};
export type ObjectifiedDates = DatesObject<ObjectifiedYears>;
export type ObjectifiedYears = DatesObject<ObjectifiedMonths>;
export type ObjectifiedMonths = DatesObject<ObjectifiedDays>;
export type ObjectifiedDays = DatesObject<ObjectifiedHours>;
export type ObjectifiedHours = DatesObject<Date[]>;

/**
 * Process an array of dates into layered objects of years, months and days.
 * @param  {Date[]} An array of dates.
 * @return {Object} Returns an object whose keys are years, whose values are objects whose keys are months (0=Jan),
 *   whose values are objects whose keys are days, whose values are arrays of all the datetimes on that day.
 */
function objectifyDates(dates: Date[]): ObjectifiedDates {
  let result: ObjectifiedDates = { indice: [], dates };

  for (let i = 0; i < dates.length; i++) {
    let date = dates[i];
    let year = date.getFullYear();
    let century = Math.floor(year / 100);
    let month = date.getMonth();
    let day = date.getDate();
    let hour = date.getHours();

    // ObjectifiedDates
    if (!result[century]) {
      result[century] = { indice: [], dates: [] };
      result.indice.push(century);
    }

    result[century].dates.push(date);

    // ObjectifiedYears
    if (!result[century][year]) {
      result[century][year] = { indice: [], dates: [] };
      result[century].indice.push(year);
    }

    result[century][year].dates.push(date);

    // ObjectifiedMonths
    if (!result[century][year][month]) {
      result[century][year][month] = { indice: [], dates: [] };
      result[century][year].indice.push(month);
    }

    result[century][year][month].dates.push(date);

    // ObjectifiedDays
    if (!result[century][year][month][day]) {
      result[century][year][month][day] = { indice: [], dates: [] };
      result[century][year][month].indice.push(day);
    }

    result[century][year][month][day].dates.push(date);

    // ObjectifiedHours
    if (!result[century][year][month][day][hour]) {
      result[century][year][month][day][hour] = [];
      result[century][year][month][day].indice.push(hour);
    }

    result[century][year][month][day][hour].push(date);
  }

  return result;
}
