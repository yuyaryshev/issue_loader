import { expect } from "chai";
import { linearDataInterpolation } from "./linearDataInterpolation";

let data = [
    {
        ms: 100,
        a: 10,
        b: 0,
    },
    {
        ms: 200,
        a: 20,
        b: 20,
    },
    {
        ms: 100,
        a: 30,
        b: 0,
    },
];
const times = [0, 100, 300, 400];

function noMs(index: number) {
    const { ms, ...r } = data[index];
    return r;
}

describe(`linearDataInterpolation`, function() {
    it(`linearDataInterpolation - exact point 0`, function() {
        expect(linearDataInterpolation(data, times[0])).to.deep.equal(noMs(0));
    });
    it(`linearDataInterpolation - exact point 1`, function() {
        expect(linearDataInterpolation(data, times[1])).to.deep.equal(noMs(1));
    });
    it(`linearDataInterpolation - exact point 2`, function() {
        expect(linearDataInterpolation(data, times[2])).to.deep.equal(noMs(2));
    });
    it(`linearDataInterpolation - exact point 3`, function() {
        expect(linearDataInterpolation(data, times[3])).to.deep.equal(noMs(0));
    });
    it(`linearDataInterpolation - exact point 1 over loop`, function() {
        expect(linearDataInterpolation(data, times[3] + times[1])).to.deep.equal(noMs(1));
    });

    it(`linearDataInterpolation - left point 0-1`, function() {
        expect(linearDataInterpolation(data, 1)).to.deep.equal({
            a: 10.1,
            b: 0.2,
        });
    });

    it(`linearDataInterpolation - right point 0-1`, function() {
        expect(linearDataInterpolation(data, 99)).to.deep.equal({
            a: 19.9,
            b: 19.8,
        });
    });

    it(`linearDataInterpolation - mid point 0-1`, function() {
        expect(linearDataInterpolation(data, 50)).to.deep.equal({
            a: 15,
            b: 10,
        });
    });

    it(`linearDataInterpolation - left point 3-0`, function() {
        expect(linearDataInterpolation(data, 301)).to.deep.equal({
            a: 29.8,
            b: 0,
        });
    });

    it(`linearDataInterpolation - right point 3-0`, function() {
        expect(linearDataInterpolation(data, 399)).to.deep.equal({
            a: 10.2,
            b: 0,
        });
    });

    it(`linearDataInterpolation - mid point 3-0`, function() {
        expect(linearDataInterpolation(data, 350)).to.deep.equal({
            a: 20,
            b: 0,
        });
    });
});
