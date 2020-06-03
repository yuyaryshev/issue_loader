export interface IntInterval {
    a: number; // Включая
    b: number; // Не включая
}

export type IntId = number;

export class IntIdManager {
    protected _intervals: IntInterval[];
    changed: boolean;
    constructor(public readonly defaultInterval: IntInterval = { a: 1, b: 100000000 }) {
        this._intervals = [defaultInterval] || [];
        this.removeInvalidIntervals();
        this.changed = false;
    }

    removeInvalidIntervals() {
        for (let i = 0; i < this.intervals.length; i++) {
            const { a, b } = this.intervals[i];
            if (a >= b) {
                this.intervals.splice(i, 1);
                i--;
                this.changed = true;
            }
        }
    }

    get intervals() {
        return this._intervals;
    }

    set intervals(v: IntInterval[]) {
        this._intervals = v;
        this.changed = false;
        this.removeInvalidIntervals();
    }

    removeId(id: IntId) {
        let ln = this.intervals.length;
        for (let i = 0; i < ln; i++) {
            const interval = this.intervals[i];
            if (interval.a <= id && id < interval.b) {
                this.changed = true;
                if (interval.a === id) {
                    interval.a++;
                    if (!(interval.a < interval.b)) this.intervals.splice(i, 1);
                } else {
                    this.intervals.splice(i, 1);
                    const newIntervs: IntInterval[] = [];
                    if (interval.a < id) this.intervals.push({ a: interval.a, b: id });

                    if (id + 1 < interval.b) this.intervals.push({ a: id + 1, b: interval.b });
                }
                break;
            }
        }
    }

    newId(): IntId {
        let ln = this.intervals.length;
        if (!ln) return 0;

        this.changed = true;
        let minIntervalIndex = 0;
        let minInterval = this.intervals[0];
        let minSize = minInterval.b - minInterval.a;

        for (let i = 1; i < ln; i++) {
            if (minSize == 1) break;

            const interval = this.intervals[i];
            const size = interval.b - interval.a;
            if (size < minSize) {
                minInterval = interval;
                minSize = size;
                minIntervalIndex = i;
            }
        }

        const r = minInterval.a++;
        if (!(minInterval.a < minInterval.b)) this.intervals.splice(minIntervalIndex, 1);
        return r;
    }

    clear() {
        this._intervals = [];
        this.changed = false;
    }
}
