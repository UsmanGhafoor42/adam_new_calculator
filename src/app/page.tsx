"use client";

import React, { useMemo, useState } from "react";

interface CalculatorInputs {
  currentAge: number;
  targetRetirementAge: number;
  desiredAnnualIncome: number;
  currentInvestments: number;
}

interface CalculationResults {
  yearsToRetirement: number;
  futureValueAtRetirement: number;
  projectedRetirementIncome: number;
  incomeSurplusOrShortfall: number;
  requiredRetirementCapital: number;
  capitalGap: number;
  annualDeficit: number;
  yearsUntilDepletion: number;
  runOutAge: number;
  isOnTrack: boolean;
}

const ASSUMPTIONS = {
  PRE_RETIREMENT_RETURN: 0.06,
  RETIREMENT_RETURN: 0.05,
  SAFE_WITHDRAWAL_RATE: 0.05,
} as const;

const InputField: React.FC<{
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
  disabled?: boolean;
}> = ({
  label,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  prefix = "$",
  disabled = false,
}) => (
  <div className="space-y-2">
    <label className="block text-sm font-medium text-white">{label}</label>
    <div className="relative">
      {prefix && (
        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white">
          {prefix}
        </span>
      )}
      <input
        type="number"
        value={value === 0 ? "" : value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400/70 ${
          prefix ? "pl-8" : ""
        } ${
          disabled
            ? "border-white/30 bg-white/10 text-white/80"
            : "border-white/60 bg-white/5 text-white"
        }`}
      />
    </div>
  </div>
);

const ResultCard: React.FC<{
  label: string;
  value: string | number;
  type?: "currency" | "number" | "percentage";
  color?: "green" | "red" | "neutral";
}> = ({ label, value, type = "number", color = "neutral" }) => {
  const formatValue = () => {
    switch (type) {
      case "currency":
        return `$${Number(value).toLocaleString(undefined, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })}`;
      case "percentage":
        return `${(Number(value) * 100).toFixed(1)}%`;
      default:
        return value.toLocaleString();
    }
  };

  const colorClasses = {
    green: "text-green-600 bg-green-50 border-green-200",
    red: "text-red-600 bg-red-50 border-red-200",
    neutral: "text-gray-700 bg-gray-50 border-gray-200",
  };

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color]}`}>
      <div className="text-sm font-medium text-white mb-1">{label}</div>
      <div className="text-xl font-bold">{formatValue()}</div>
    </div>
  );
};

export default function RetirementCalculator() {
  const [inputs, setInputs] = useState<CalculatorInputs>({
    currentAge: 0,
    targetRetirementAge: 0,
    desiredAnnualIncome: 0,
    currentInvestments: 0,
  });
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [showResults, setShowResults] = useState(false);
  const [lifeExpectancy, setLifeExpectancy] = useState(90);

  const results = useMemo((): CalculationResults => {
    const {
      currentAge,
      targetRetirementAge,
      desiredAnnualIncome,
      currentInvestments,
    } = inputs;

    const yearsToRetirement = Math.max(0, targetRetirementAge - currentAge);

    const futureValueAtRetirement =
      yearsToRetirement > 0
        ? currentInvestments *
          Math.pow(1 + ASSUMPTIONS.PRE_RETIREMENT_RETURN, yearsToRetirement)
        : currentInvestments;

    const projectedRetirementIncome =
      futureValueAtRetirement * ASSUMPTIONS.SAFE_WITHDRAWAL_RATE;
    const incomeSurplusOrShortfall =
      projectedRetirementIncome - desiredAnnualIncome;

    const requiredRetirementCapital =
      desiredAnnualIncome / ASSUMPTIONS.SAFE_WITHDRAWAL_RATE;
    const capitalGap = Math.max(
      0,
      requiredRetirementCapital - futureValueAtRetirement,
    );

    const annualDeficit = Math.max(
      0,
      desiredAnnualIncome - projectedRetirementIncome,
    );

    let yearsUntilDepletion = 0;
    let runOutAge = targetRetirementAge;

    if (
      futureValueAtRetirement > 0 &&
      desiredAnnualIncome > projectedRetirementIncome
    ) {
      const withdrawalRate = desiredAnnualIncome / futureValueAtRetirement;
      if (!Number.isFinite(withdrawalRate) || withdrawalRate <= 0) {
        yearsUntilDepletion = Infinity;
        runOutAge = lifeExpectancy;
      } else if (withdrawalRate < ASSUMPTIONS.RETIREMENT_RETURN) {
        yearsUntilDepletion = Infinity;
        runOutAge = lifeExpectancy;
      } else {
        const ratio = withdrawalRate / ASSUMPTIONS.RETIREMENT_RETURN;
        yearsUntilDepletion =
          ratio >= 1
            ? futureValueAtRetirement / Math.max(annualDeficit, 1)
            : Math.log(1 / (1 - ratio)) /
              Math.log(1 + ASSUMPTIONS.RETIREMENT_RETURN);
        runOutAge = targetRetirementAge + yearsUntilDepletion;
      }
    } else if (desiredAnnualIncome <= projectedRetirementIncome) {
      yearsUntilDepletion = Infinity;
      runOutAge = lifeExpectancy;
    }

    const isOnTrack =
      incomeSurplusOrShortfall >= 0 && yearsUntilDepletion === Infinity;

    return {
      yearsToRetirement,
      futureValueAtRetirement,
      projectedRetirementIncome,
      incomeSurplusOrShortfall,
      requiredRetirementCapital,
      capitalGap,
      annualDeficit,
      yearsUntilDepletion,
      runOutAge,
      isOnTrack,
    };
  }, [inputs]);

  const updateInput = (field: keyof CalculatorInputs, value: number) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    // Validate current step before proceeding
    if (step === 1 && inputs.currentAge < 18) return;
    if (step === 2 && inputs.targetRetirementAge <= inputs.currentAge) return;
    if (step === 3 && inputs.desiredAnnualIncome <= 0) return;
    if (step === 4 && inputs.currentInvestments < 0) return;

    setStep((prev) => (prev < 4 ? ((prev + 1) as 1 | 2 | 3 | 4) : prev));
  };

  const handleBack = () => {
    setStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3 | 4) : prev));
  };

  const handleSubmit = () => {
    // Validate all inputs before submitting
    if (
      inputs.currentAge < 18 ||
      inputs.targetRetirementAge <= inputs.currentAge ||
      inputs.desiredAnnualIncome <= 0 ||
      inputs.currentInvestments < 0
    )
      return;

    setShowResults(true);
  };

  const handleRestart = () => {
    setShowResults(false);
    setStep(1);
    setInputs({
      currentAge: 0,
      targetRetirementAge: 0,
      desiredAnnualIncome: 0,
      currentInvestments: 0,
    });
  };

  const timelineData = useMemo(() => {
    const ages = [];
    const balances = [];

    for (let age = inputs.currentAge; age <= lifeExpectancy; age++) {
      if (age <= inputs.targetRetirementAge) {
        const yearsToRetirement = inputs.targetRetirementAge - age;
        const balance =
          inputs.currentInvestments *
          Math.pow(
            1 + ASSUMPTIONS.PRE_RETIREMENT_RETURN,
            inputs.targetRetirementAge - age,
          );
        ages.push(age);
        balances.push(balance);
      } else {
        const yearsInRetirement = age - inputs.targetRetirementAge;
        const retirementStartBalance = results.futureValueAtRetirement;

        if (retirementStartBalance <= 0) {
          ages.push(age);
          balances.push(0);
        } else if (results.yearsUntilDepletion === Infinity) {
          const balance =
            retirementStartBalance *
            Math.pow(
              1 +
                ASSUMPTIONS.RETIREMENT_RETURN -
                results.projectedRetirementIncome / retirementStartBalance,
              yearsInRetirement,
            );
          ages.push(age);
          balances.push(Math.max(0, balance));
        } else if (yearsInRetirement <= results.yearsUntilDepletion) {
          const balance =
            retirementStartBalance *
            Math.pow(
              1 +
                ASSUMPTIONS.RETIREMENT_RETURN -
                inputs.desiredAnnualIncome / retirementStartBalance,
              yearsInRetirement,
            );
          ages.push(age);
          balances.push(Math.max(0, balance));
        } else {
          ages.push(age);
          balances.push(0);
        }
      }
    }

    return { ages, balances };
  }, [inputs, results]);

  const maxBalance = Math.max(...timelineData.balances, 1);

  const leftResults = [
    {
      label: "Years to Retirement",
      value: results.yearsToRetirement,
      type: "number" as const,
    },
    {
      label: "Future Value at Retirement",
      value: results.futureValueAtRetirement,
      type: "currency" as const,
    },
    {
      label: "Projected Annual Income",
      value: results.projectedRetirementIncome,
      type: "currency" as const,
    },
    {
      label: "Income Surplus/Shortfall",
      value: results.incomeSurplusOrShortfall,
      type: "currency" as const,
      color: results.incomeSurplusOrShortfall >= 0 ? "green" : "red",
    },
  ];

  const rightResults = [
    {
      label: "Required Retirement Capital",
      value: results.requiredRetirementCapital,
      type: "currency" as const,
    },
    {
      label: "Capital Gap",
      value: results.capitalGap,
      type: "currency" as const,
      color: results.capitalGap > 0 ? "red" : "green",
    },
    ...(results.annualDeficit > 0
      ? [
          {
            label: "Annual Deficit",
            value: results.annualDeficit,
            type: "currency" as const,
            color: "red" as const,
          },
        ]
      : []),
    ...(results.yearsUntilDepletion !== Infinity
      ? [
          {
            label: "Years Until Depletion",
            value: Number(results.yearsUntilDepletion.toFixed(1)),
            type: "number" as const,
            color: "red" as const,
          },
        ]
      : []),
    ...(results.runOutAge < lifeExpectancy
      ? [
          {
            label: "Funds Run Out At Age",
            value: Number(results.runOutAge.toFixed(0)),
            type: "number" as const,
            color: "red" as const,
          },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen transition-colors duration-300 bg-white">
      <div className="relative overflow-hidden">
        <div className="container relative mx-auto px-6 py-10 max-w-6xl">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <div>
              {showResults && (
                <button
                  type="button"
                  onClick={handleRestart}
                  className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-teal-700 transition hover:text-teal-900"
                >
                  <span className="text-lg">←</span> Back to Step 1
                </button>
              )}
              {!showResults ? (
                <>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-600">
                    Retirement Blueprint
                  </p>
                  <h1 className="mt-4 text-4xl font-bold leading-tight text-teal-900 md:text-5xl">
                    Build your personalized Retirement Blueprint to ensure
                    long-term financial freedom.
                  </h1>
                  <p className="mt-4 text-lg text-teal-700 max-w-xl">
                    Enter your details to see how your retirement investments
                    grow and when your income can sustain your lifestyle.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-600">
                    Retirement Blueprint
                  </p>
                  <h1 className="mt-4 text-4xl font-bold leading-tight text-teal-900 md:text-5xl">
                    Here's your personalized Retirement Blueprint results.
                  </h1>
                </>
              )}
            </div>
            <div className="relative flex justify-center lg:justify-end">
              <img
                src="/blob.svg"
                alt=""
                className="pointer-events-none absolute -right-10 -top-10 w-56 max-w-[70vw] sm:w-64 md:w-72 lg:w-96"
              />
              <img
                src="/dots.svg"
                alt=""
                className="pointer-events-none absolute -left-4 top-[20rem] w-28 max-w-[45vw] opacity-80 sm:w-32 md:w-36 lg:w-48"
              />

              <div className="relative z-10 w-full max-w-md rounded-3xl bg-teal-900 p-6 text-white shadow-xl sm:p-7">
                {/* <div className="text-sm font-semibold text-orange-400">
                Step 1
              </div> */}
                <h2 className="mt-2 text-2xl font-semibold text-orange-400">
                  Your Retirement Inputs
                </h2>
                {!showResults && (
                  <div
                    key={step}
                    className="mt-5 grid gap-4 transition-all duration-300 ease-out"
                    style={{ animation: "stepFade 0.35s ease-out" }}
                  >
                    {step === 1 && (
                      <>
                        <h3 className="text-xl font-bold text-white">
                          <span className="text-orange-500">Step 1: </span>
                          What is your current age?
                        </h3>
                        <InputField
                          label="Current Age"
                          value={inputs.currentAge}
                          onChange={(value) => updateInput("currentAge", value)}
                          min={18}
                          max={100}
                          prefix=""
                        />
                      </>
                    )}
                    {step === 2 && (
                      <>
                        <h3 className="text-xl font-bold text-white">
                          <span className="text-orange-500">Step 2: </span>
                          At what age do you plan to retire?
                        </h3>
                        <InputField
                          label="Target Retirement Age"
                          value={inputs.targetRetirementAge}
                          onChange={(value) =>
                            updateInput("targetRetirementAge", value)
                          }
                          min={inputs.currentAge + 1}
                          max={100}
                          prefix=""
                        />
                      </>
                    )}
                    {step === 3 && (
                      <>
                        <h3 className="text-xl font-bold text-white">
                          <span className="text-orange-500">Step 3: </span>
                          How much yearly income do you want during retirement?
                        </h3>
                        <InputField
                          label="Desired Annual Retirement Income"
                          value={inputs.desiredAnnualIncome}
                          onChange={(value) =>
                            updateInput("desiredAnnualIncome", value)
                          }
                          min={0}
                          step={1000}
                        />
                      </>
                    )}
                    {step === 4 && (
                      <>
                        <h3 className="text-xl font-bold text-white">
                          <span className="text-orange-500">Step 4: </span>
                          What is the total value of your current retirement
                          investments?
                        </h3>
                        <InputField
                          label="Current Retirement Investments (excluding primary residence)"
                          value={inputs.currentInvestments}
                          onChange={(value) =>
                            updateInput("currentInvestments", value)
                          }
                          min={0}
                          step={1000}
                        />
                      </>
                    )}
                    <div className="flex items-center justify-between gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handleBack}
                        disabled={step === 1}
                        className={`rounded-full border px-5 py-2 text-sm font-semibold transition ${
                          step === 1
                            ? "cursor-not-allowed border-white/30 text-white/40"
                            : "border-white/60 text-white hover:bg-white/10"
                        }`}
                      >
                        Back
                      </button>
                      {step < 4 ? (
                        <button
                          type="button"
                          onClick={handleNext}
                          disabled={
                            (step === 1 && inputs.currentAge < 18) ||
                            (step === 2 &&
                              inputs.targetRetirementAge <=
                                inputs.currentAge) ||
                            (step === 3 && inputs.desiredAnnualIncome <= 0) ||
                            (step === 4 && inputs.currentInvestments < 0)
                          }
                          className={`rounded-full bg-orange-500 px-6 py-2 text-sm font-semibold text-white shadow-md shadow-orange-500/30 transition ${
                            (step === 1 && inputs.currentAge < 18) ||
                            (step === 2 &&
                              inputs.targetRetirementAge <=
                                inputs.currentAge) ||
                            (step === 3 && inputs.desiredAnnualIncome <= 0) ||
                            (step === 4 && inputs.currentInvestments < 0)
                              ? "cursor-not-allowed opacity-50"
                              : "hover:bg-orange-400"
                          }`}
                        >
                          Next
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSubmit}
                          disabled={
                            inputs.currentAge < 18 ||
                            inputs.targetRetirementAge <= inputs.currentAge ||
                            inputs.desiredAnnualIncome <= 0 ||
                            inputs.currentInvestments < 0
                          }
                          className={`rounded-full bg-orange-500 px-6 py-2 text-sm font-semibold text-white shadow-md shadow-orange-500/30 transition ${
                            inputs.currentAge < 18 ||
                            inputs.targetRetirementAge <= inputs.currentAge ||
                            inputs.desiredAnnualIncome <= 0 ||
                            inputs.currentInvestments < 0
                              ? "cursor-not-allowed opacity-50"
                              : "hover:bg-orange-400"
                          }`}
                        >
                          Submit
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {showResults && (
                  <div className="mt-5 grid gap-4">
                    <InputField
                      label="Current Age"
                      value={inputs.currentAge}
                      onChange={(value) => updateInput("currentAge", value)}
                      min={18}
                      max={100}
                      prefix=""
                    />
                    <InputField
                      label="Target Retirement Age"
                      value={inputs.targetRetirementAge}
                      onChange={(value) =>
                        updateInput("targetRetirementAge", value)
                      }
                      min={inputs.currentAge + 1}
                      max={100}
                      prefix=""
                    />
                    <InputField
                      label="Desired Annual Retirement Income"
                      value={inputs.desiredAnnualIncome}
                      onChange={(value) =>
                        updateInput("desiredAnnualIncome", value)
                      }
                      min={0}
                      step={1000}
                    />
                    <InputField
                      label="Current Retirement Investments (excluding primary residence)"
                      value={inputs.currentInvestments}
                      onChange={(value) =>
                        updateInput("currentInvestments", value)
                      }
                      min={0}
                      step={1000}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {showResults && (
            <div className="mt-12 flex justify-center items-center">
              <div
                className={`rounded-3xl border-2 p-6 ${
                  results.isOnTrack
                    ? "border-green-300 bg-green-100"
                    : "border-red-300 bg-red-100"
                }`}
              >
                <div
                  className={`text-3xl font-bold ${
                    results.isOnTrack ? "text-green-800" : "text-red-800"
                  }`}
                >
                  {results.isOnTrack ? "On Track!" : "Off Track!"}
                </div>
                <p
                  className={`mt-3 text-lg ${
                    results.isOnTrack ? "text-green-700" : "text-red-700"
                  }`}
                >
                  {results.isOnTrack
                    ? `You're on track to retire at ${inputs.targetRetirementAge} with your desired income.`
                    : `You have a ${
                        results.capitalGap > 0
                          ? "$" + results.capitalGap.toLocaleString() + " "
                          : ""
                      }gap to reach your retirement goals.`}
                </p>
              </div>
            </div>
          )}

          {showResults && (
            <div className="mt-10 grid gap-8 lg:grid-cols-[0.4fr_0.6fr]">
              <div className="rounded-3xl border border-teal-200 bg-white p-6 shadow-lg">
                <h2 className="text-2xl font-semibold text-teal-900">
                  Assumptions Used
                </h2>
                <div className="mt-4 grid gap-3 text-sm">
                  <div className="flex items-center justify-between rounded-xl border border-teal-100 bg-teal-50 px-4 py-3">
                    <span className="text-teal-800">Pre-Retirement Return</span>
                    <span className="font-semibold text-teal-900">
                      {(ASSUMPTIONS.PRE_RETIREMENT_RETURN * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-teal-100 bg-teal-50 px-4 py-3">
                    <span className="text-teal-800">Retirement Return</span>
                    <span className="font-semibold text-teal-900">
                      {(ASSUMPTIONS.RETIREMENT_RETURN * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-teal-100 bg-teal-50 px-4 py-3">
                    <span className="text-teal-800">Safe Withdrawal Rate</span>
                    <span className="font-semibold text-teal-900">
                      {(ASSUMPTIONS.SAFE_WITHDRAWAL_RATE * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-teal-100 bg-teal-50 px-4 py-3">
                    <span className="text-teal-800">Life Expectancy</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={lifeExpectancy}
                        onChange={(e) =>
                          setLifeExpectancy(Number(e.target.value))
                        }
                        min={inputs.targetRetirementAge + 1}
                        max={120}
                        className="w-16 px-2 py-1 text-right font-semibold text-teal-900 border border-teal-200 rounded focus:outline-none focus:ring-2 focus:ring-teal-400"
                      />
                      <span className="font-semibold text-teal-900">years</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="rounded-3xl border border-teal-200 bg-white px-3 py-3 shadow-lg">
                <h2 className="text-2xl font-semibold text-white bg-teal-900 rounded-t-2xl p-3">
                  Your Retirement Results
                </h2>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {[leftResults, rightResults].map((table, tableIndex) => (
                    <div
                      key={tableIndex}
                      className="rounded-2xl border border-orange-200 p-4"
                    >
                      <div className="mb-3 text-sm font-semibold text-teal-800">
                        {tableIndex === 0
                          ? "Retirement Summary"
                          : "Funding Detail"}
                      </div>
                      <div className="space-y-3">
                        {table.map((row) => (
                          <div
                            key={row.label}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-teal-900">{row.label}</span>
                            <span
                              className={`font-semibold ${
                                row.color === "green"
                                  ? "text-green-600"
                                  : row.color === "red"
                                    ? "text-red-600"
                                    : "text-teal-900"
                              }`}
                            >
                              {row.type === "currency"
                                ? `$${Number(row.value).toLocaleString()}`
                                : Number(row.value).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="mt-32 pb-8">
            <div className="max-w-7xl mx-auto">
              <div className="p-6 text-black">
                <p className="mb-3">
                  Disclaimer: This retirement calculator is provided for
                  educational and illustrative purposes only. Results are based
                  on user inputs and assumptions that may not reflect actual
                  future performance, market conditions, tax laws, or personal
                  circumstances. The projections and outputs generated are not
                  guarantees of future results and should not be relied upon as
                  financial, investment, tax, or legal advice.
                </p>
                <p className="mb-3">
                  Use of this calculator does not create an advisor client
                  relationship, and we make no representations or warranties as
                  to the accuracy or completeness of the information provided.
                </p>
                <p className="mb-3">
                  We are not attorneys, investment advisors, accountants, tax
                  professionals or financial advisors and any of the content
                  presented should not be taken as professional advice. We
                  recommend seeking the advice of a financial professional
                  before making any investment decision, and we accept no
                  liability whatsoever for any loss or damage you may incur. We
                  urge you to perform your own due diligence and seek the advice
                  of your own professional before making any investment.
                </p>
                <p>
                  For a complete list of Disclosures{" "}
                  <a
                    href="https://elevestcapital.com/disclosures"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline font-bold"
                  >
                    CLICK HERE
                  </a>
                </p>
              </div>
            </div>
          </div>
          <style jsx global>{`
            @keyframes stepFade {
              from {
                opacity: 0;
                transform: translateY(8px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
          `}</style>
        </div>
      </div>
    </div>
  );
}
