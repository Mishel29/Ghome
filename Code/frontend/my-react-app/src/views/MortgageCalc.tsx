import { useSearchParams } from "react-router-dom";
import { graphqlRequest } from "../api/graphql";
import { mortgage } from "../lib/calculations";
import { useState, useMemo } from "react";
import { fmt } from "../data";

const Slider = ({ label, value, min, max, step = 1, onChange, display }: {
    label: string; value: number; min: number; max: number; step?: number;
    onChange: (v: number) => void; display: string;
  }) => (
    <div>
      <div className="flex justify-between items-center mb-2">
        <label className="text-xs font-semibold text-stone uppercase tracking-wider">{label}</label>
        <span className="text-sm font-bold text-navy">{display}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
        className="w-full accent-amber"
      />
      <div className="flex justify-between text-[10px] text-stone mt-1">
        <span>{typeof min === "number" && min >= 1000 ? fmt(min) : min + (label.includes("Rate") ? "%" : "")}</span>
        <span>{typeof max === "number" && max >= 1000 ? fmt(max) : max + (label.includes("Rate") ? "%" : "")}</span>
      </div>
    </div>
  );


export default function MortgageCalc() {
  const [searchParams] = useSearchParams();
  const initialPrice = Number(searchParams.get("price"));
  const [price, setPrice] = useState(initialPrice > 0 && Number.isFinite(initialPrice) ? initialPrice : 450000);
  const [deposit, setDeposit] = useState(price * 0.1);
  const [rate, setRate] = useState(3.9);
  const [years, setYears] = useState(30);
  const [income1, setIncome1] = useState(75000);
  const [income2, setIncome2] = useState(0);
  const [affordabilityChecked, setAffordabilityChecked] = useState(false);
  const [affordabilityError, setAffordabilityError] = useState("");

  const calc = useMemo(() => {
    const result = mortgage(price, Math.min(deposit, price), rate, years);
    const {principal} = result;
    const totalIncome = income1 + income2;
    const maxLoan = totalIncome * 3.5;
    const affordable = totalIncome > 0 && maxLoan >= principal;
    return { ...result, totalIncome, maxLoan, affordable };
  }, [price, deposit, rate, years, income1, income2]);

  const checkAffordability = async () => {
    setAffordabilityError("");
    if (!Number.isFinite(calc.totalIncome) || calc.totalIncome <= 0) {
      setAffordabilityChecked(false);
      setAffordabilityError("Enter at least one annual gross income to check affordability.");
      return;
    }
    try {
      await graphqlRequest("mutation($price:Float!,$deposit:Float!,$rate:Float!,$years:Int!,$income:Float!){recordMortgageCalculation(price:$price,deposit:$deposit,rate:$rate,years:$years,income:$income)}", { price, deposit: Math.min(deposit, price), rate, years, income: calc.totalIncome });
      setAffordabilityChecked(true);
    } catch {
      setAffordabilityChecked(true);
    }
  };


  return (
    <div className="bg-cream min-h-screen">
      <div className="bg-navy py-10 px-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="font-display text-white text-3xl font-bold">Mortgage Calculator</h1>
          <p className="text-white/60 text-sm mt-1">Estimate your monthly repayments and check affordability</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Inputs */}
          <div className="lg:col-span-3 bg-cream-dark p-7 space-y-6">
            <h2 className="font-display text-navy text-xl font-semibold">Loan Details</h2>

            <Slider label="Property Price" value={price} min={Math.min(150000, price)} max={Math.max(1200000, price)} step={5000} onChange={(value) => {setPrice(value); setDeposit((old) => Math.min(Math.max(old, value * 0.1), value * 0.5));}} display={fmt(price)}/>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-stone uppercase tracking-wider">Deposit</label>
                <span className="text-sm font-bold text-navy">{fmt(deposit)} ({Math.round(deposit / price * 100)}%)</span>
              </div>
              <input type="range" min={Math.round(price * 0.1)} max={Math.round(price * 0.5)} step={5000} value={Math.min(deposit, price * 0.5)} onChange={(e) => setDeposit(Math.max(0, Number(e.target.value)))} className="w-full accent-amber"/>
              <div className="flex justify-between text-[10px] text-stone mt-1">
                <span>10%</span><span>50%</span>
              </div>
            </div>

            <Slider label="Interest Rate (%)" value={rate} min={0} max={8} step={0.05} onChange={setRate} display={rate.toFixed(2) + "%"}/>
            <Slider label="Term (Years)" value={years} min={5} max={35} onChange={setYears} display={years + " years"}/>

            <div className="pt-4 border-t border-[#ddd5c5]">
              <h3 className="font-display text-navy font-semibold text-base mb-4">Affordability Check</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-stone block mb-1.5">Applicant 1 Income</label>
                  <input
                    type="number"
                    className="w-full border border-[#ddd5c5] bg-cream px-3 py-2.5 text-sm text-navy"
                    min={0}
                    step={1000}
                    value={income1}
                    onChange={(e) => setIncome1(Math.max(0, Number(e.target.value)))}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone block mb-1.5">Applicant 2 Income</label>
                  <input
                    type="number"
                    className="w-full border border-[#ddd5c5] bg-cream px-3 py-2.5 text-sm text-navy"
                    min={0}
                    step={1000}
                    value={income2}
                    onChange={(e) => setIncome2(Math.max(0, Number(e.target.value)))}
                  />
                </div>
              </div>
              <button type="button" className="mt-4 bg-navy text-white px-4 py-2 text-sm font-semibold" onClick={() => void checkAffordability()}>
                Check affordability
              </button>
              {affordabilityError && <p className="text-xs text-red-700 mt-2">{affordabilityError}</p>}
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-2 space-y-4">
            {/* Monthly payment hero */}
            <div className="bg-navy p-7 text-white text-center">
              <div className="text-white/60 text-xs uppercase tracking-widest mb-2">Monthly Repayment</div>
              <div className="font-display text-4xl font-bold text-amber">{fmt(Math.round(calc.monthly))}</div>
              <div className="text-white/50 text-xs mt-1">per month · {years} year term</div>
            </div>

            {/* Stats */}
            <div className="bg-cream-dark p-6 space-y-4">
              {[
                { label: "Loan Amount", value: fmt(Math.round(calc.principal)) },
                { label: "Total Repayment", value: fmt(Math.round(calc.total)) },
                { label: "Total Interest", value: fmt(Math.round(calc.totalInterest)) },
                { label: "LTV Ratio", value: calc.ltv.toFixed(1) + "%" },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center py-2 border-b border-[#ddd5c5] last:border-0">
                  <span className="text-xs text-stone">{label}</span>
                  <span className="font-semibold text-navy text-sm">{value}</span>
                </div>
              ))}
            </div>

            {/* Affordability result */}
            <div className={`p-5 border-l-4 ${calc.affordable ? "border-sage bg-sage/10" : "border-amber bg-amber/10"}`}>
              <div className="font-semibold text-sm text-navy mb-1">
                {!affordabilityChecked ? "Check your affordability" : calc.affordable ? "✓ Within illustrative income estimate" : "⚠ Above illustrative income estimate"}
              </div>
              <div className="text-xs text-stone">
                Based on 3.5× gross annual income, max loan: <strong>{fmt(Math.round(calc.maxLoan))}</strong>.<br/>
                {affordabilityChecked && (calc.affordable
                  ? "This is an illustrative comparison, not a lending decision."
                  : "Consider a larger deposit or lower purchase price.")}
              </div>
            </div>

            <div className="text-[10px] text-stone p-3 bg-cream-dark">
              Indicative figures only. Subject to lender assessment. Consult a qualified financial adviser before making any decisions.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
