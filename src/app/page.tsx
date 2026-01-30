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
  LIFE_EXPECTANCY: 90,
} as const;

const InputField: React.FC<{
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
}> = ({ label, value, onChange, min = 0, max, step = 1, prefix = "$" }) => (
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
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          prefix ? "pl-8" : ""
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
    currentAge: 30,
    targetRetirementAge: 65,
    desiredAnnualIncome: 60000,
    currentInvestments: 50000,
  });

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
        runOutAge = ASSUMPTIONS.LIFE_EXPECTANCY;
      } else if (withdrawalRate < ASSUMPTIONS.RETIREMENT_RETURN) {
        yearsUntilDepletion = Infinity;
        runOutAge = ASSUMPTIONS.LIFE_EXPECTANCY;
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
      runOutAge = ASSUMPTIONS.LIFE_EXPECTANCY;
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

  const timelineData = useMemo(() => {
    const ages = [];
    const balances = [];

    for (
      let age = inputs.currentAge;
      age <= ASSUMPTIONS.LIFE_EXPECTANCY;
      age++
    ) {
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
    ...(results.runOutAge < ASSUMPTIONS.LIFE_EXPECTANCY
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
    <div
      // className={`min-h-screen transition-colors duration-300 bg-white ${
      //   results.isOnTrack ? "bg-green-50" : "bg-red-50"
      // }`}
      className="min-h-screen transition-colors duration-300 bg-white"
    >
      <div className="relative overflow-hidden">
        <div className="container relative mx-auto px-6 py-10 max-w-6xl">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-600">
                Retirement Blueprint
              </p>
              <h1 className="mt-4 text-4xl font-bold leading-tight text-teal-900 md:text-5xl">
                Build your personalized plan to long-term financial freedom.
              </h1>
              <p className="mt-4 text-lg text-teal-700 max-w-xl">
                Enter your details to see how your retirement investments grow
                and when your income can sustain your lifestyle.
              </p>
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
                    label="Current Retirement Investments"
                    value={inputs.currentInvestments}
                    onChange={(value) =>
                      updateInput("currentInvestments", value)
                    }
                    min={0}
                    step={1000}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_1.2fr]">
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

            <div className="rounded-3xl border border-teal-200 bg-white p-6 shadow-lg">
              {/* <div className="text-sm font-semibold uppercase tracking-wide text-orange-500">
                Step 2
              </div> */}
              <h2 className="mt-2 text-2xl font-semibold text-teal-900">
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

          <div className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl bg-teal-900 p-6 text-white shadow-xl">
              {/* <div className="text-sm font-semibold text-orange-400">
                Step 3
              </div> */}
              <h2 className="mt-2 text-2xl font-semibold">
                Retirement Timeline
              </h2>
              <div className="mt-4 rounded-2xl bg-white/10 p-4">
                <div className="relative h-56">
                  <div className="absolute inset-0 flex items-end justify-between gap-1">
                    {timelineData.ages.map((age, index) => {
                      const balance = timelineData.balances[index];
                      const height = (balance / maxBalance) * 100;
                      const isRetirementAge =
                        age === inputs.targetRetirementAge;
                      const isRunOutAge =
                        age === Math.floor(results.runOutAge) &&
                        results.runOutAge < ASSUMPTIONS.LIFE_EXPECTANCY;

                      return (
                        <div
                          key={age}
                          className="flex flex-1 flex-col items-center"
                        >
                          <div
                            className={`w-full rounded-t transition-all duration-300 ${
                              balance > 0
                                ? results.isOnTrack
                                  ? "bg-green-400"
                                  : "bg-sky-400"
                                : "bg-red-400"
                            } ${isRetirementAge ? "ring-2 ring-orange-400" : ""}`}
                            style={{ height: `${height}%` }}
                          />
                          <div className="text-[10px] mt-1 text-white/80">
                            {age % 5 === 0 || isRetirementAge || isRunOutAge
                              ? age
                              : ""}
                          </div>
                          {isRetirementAge && (
                            <div className="text-[10px] text-orange-200 mt-1">
                              Retirement
                            </div>
                          )}
                          {isRunOutAge && (
                            <div className="text-[10px] text-red-200 mt-1">
                              Depleted
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-4 text-xs text-white/80">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-sky-400" />
                    Investment Growth
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-orange-400" />
                    Retirement Age
                  </div>
                  {results.runOutAge < ASSUMPTIONS.LIFE_EXPECTANCY && (
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-red-400" />
                      Funds Depleted
                    </div>
                  )}
                </div>
              </div>
            </div>

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
                  <span className="font-semibold text-teal-900">
                    {ASSUMPTIONS.LIFE_EXPECTANCY} years
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
