import { describe, it, expect } from 'vitest';
import { mortgage, historyGrowth, comparisonSelection } from './calculations';
describe('public property calculations',()=>{
 it('UC-U03: amortization agrees with a known payment and handles zero interest/full deposit',()=>{expect(mortgage(100000,0,6,30).monthly).toBeCloseTo(599.55,2);expect(mortgage(120000,0,0,10).monthly).toBe(1000);expect(mortgage(100,100,4,20).total).toBe(0);});
 it('UC-U03: rejects invalid input instead of returning NaN or negative loans',()=>{for(const args of [[0,0,3,30],[100,101,3,30],[100,-1,3,30],[100,0,-1,30],[100,0,3,0],[NaN,0,3,30]])expect(()=>mortgage(...args as [number,number,number,number])).toThrow();});
 it('UC-U05: history sorts actual years and computes positive/negative growth without synthetic entries',()=>{expect(historyGrowth([])).toEqual([]);expect(historyGrowth([{year:2026,value:90},{year:2023,value:100}])).toEqual([{year:'2023',value:100,growth:0},{year:'2026',value:90,growth:expect.closeTo(-10)}]);expect(historyGrowth([{year:2020,value:0},{year:2021,value:10}])[1].growth).toBe(0);});
 it('UC-U04: compare adds/removes properties and caps the list at three',()=>{expect(comparisonSelection([],'a')).toEqual(['a']);expect(comparisonSelection(['a','b'],'a')).toEqual(['b']);expect(comparisonSelection(['a','b','c'],'d')).toEqual(['a','b','c']);});
});
