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
    <label className="block text-sm font-medium text-gray-700">{label}</label>
    <div className="relative">
      {prefix && (
        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
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
      <div className="text-sm font-medium text-gray-600 mb-1">{label}</div>
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

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        results.isOnTrack ? "bg-green-50" : "bg-red-50"
      }`}
    >
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Retirement Calculator
          </h1>
          <p className="text-lg text-gray-600">
            Plan your financial future with confidence
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-6 text-gray-800">
            Your Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
              onChange={(value) => updateInput("targetRetirementAge", value)}
              min={inputs.currentAge + 1}
              max={100}
              prefix=""
            />
            <InputField
              label="Desired Annual Retirement Income"
              value={inputs.desiredAnnualIncome}
              onChange={(value) => updateInput("desiredAnnualIncome", value)}
              min={0}
              step={1000}
            />
            <InputField
              label="Current Retirement Investments"
              value={inputs.currentInvestments}
              onChange={(value) => updateInput("currentInvestments", value)}
              min={0}
              step={1000}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-6 text-gray-800">
            Your Retirement Outlook
          </h2>
          <div
            className={`text-center p-6 rounded-lg mb-6 ${
              results.isOnTrack
                ? "bg-green-100 border-2 border-green-300"
                : "bg-red-100 border-2 border-red-300"
            }`}
          >
            <div
              className={`text-3xl font-bold mb-2 ${
                results.isOnTrack ? "text-green-800" : "text-red-800"
              }`}
            >
              {results.isOnTrack ? "On Track!" : "Off Track!"}
            </div>
            <div
              className={`text-lg ${
                results.isOnTrack ? "text-green-700" : "text-red-700"
              }`}
            >
              {results.isOnTrack
                ? `You're on track to retire at ${inputs.targetRetirementAge} with your desired income.`
                : `You have a ${results.capitalGap > 0 ? "$" + results.capitalGap.toLocaleString() + " " : ""}gap to reach your retirement goals.`}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <ResultCard
              label="Years to Retirement"
              value={results.yearsToRetirement}
              type="number"
            />
            <ResultCard
              label="Future Value at Retirement"
              value={results.futureValueAtRetirement}
              type="currency"
            />
            <ResultCard
              label="Projected Annual Income"
              value={results.projectedRetirementIncome}
              type="currency"
            />
            <ResultCard
              label="Income Surplus/Shortfall"
              value={results.incomeSurplusOrShortfall}
              type="currency"
              color={results.incomeSurplusOrShortfall >= 0 ? "green" : "red"}
            />
            <ResultCard
              label="Required Retirement Capital"
              value={results.requiredRetirementCapital}
              type="currency"
            />
            <ResultCard
              label="Capital Gap"
              value={results.capitalGap}
              type="currency"
              color={results.capitalGap > 0 ? "red" : "green"}
            />
            {results.annualDeficit > 0 && (
              <ResultCard
                label="Annual Deficit"
                value={results.annualDeficit}
                type="currency"
                color="red"
              />
            )}
            {results.yearsUntilDepletion !== Infinity && (
              <ResultCard
                label="Years Until Depletion"
                value={results.yearsUntilDepletion.toFixed(1)}
                type="number"
                color="red"
              />
            )}
            {results.runOutAge < ASSUMPTIONS.LIFE_EXPECTANCY && (
              <ResultCard
                label="Funds Run Out At Age"
                value={results.runOutAge.toFixed(0)}
                type="number"
                color="red"
              />
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-6 text-gray-800">
            Retirement Timeline
          </h2>
          <div className="relative h-64 bg-gray-100 rounded-lg p-4">
            <div className="absolute inset-0 flex items-end justify-between px-4 pb-4">
              {timelineData.ages.map((age, index) => {
                const balance = timelineData.balances[index];
                const height = (balance / maxBalance) * 100;
                const isRetirementAge = age === inputs.targetRetirementAge;
                const isRunOutAge =
                  age === Math.floor(results.runOutAge) &&
                  results.runOutAge < ASSUMPTIONS.LIFE_EXPECTANCY;

                return (
                  <div
                    key={age}
                    className="flex flex-col items-center flex-1 max-w-8"
                  >
                    <div
                      className={`w-full transition-all duration-300 rounded-t ${
                        balance > 0
                          ? results.isOnTrack
                            ? "bg-green-500"
                            : "bg-blue-500"
                          : "bg-red-500"
                      } ${isRetirementAge ? "ring-2 ring-orange-400" : ""}`}
                      style={{ height: `${height}%` }}
                    />
                    <div className="text-xs mt-1 text-gray-600">
                      {age % 5 === 0 || isRetirementAge || isRunOutAge
                        ? age
                        : ""}
                    </div>
                    {isRetirementAge && (
                      <div className="text-xs text-orange-600 font-semibold mt-1">
                        Retirement
                      </div>
                    )}
                    {isRunOutAge && (
                      <div className="text-xs text-red-600 font-semibold mt-1">
                        Depleted
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-4 flex justify-center space-x-8 text-sm">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
              <span>Investment Growth</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-orange-400 rounded mr-2 ring-2 ring-orange-400"></div>
              <span>Retirement Age</span>
            </div>
            {results.runOutAge < ASSUMPTIONS.LIFE_EXPECTANCY && (
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
                <span>Funds Depleted</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">
            Assumptions Used
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="text-center p-3 bg-gray-50 rounded">
              <div className="font-semibold text-gray-700">
                Pre-Retirement Return
              </div>
              <div className="text-lg">
                {(ASSUMPTIONS.PRE_RETIREMENT_RETURN * 100).toFixed(0)}%
              </div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded">
              <div className="font-semibold text-gray-700">
                Retirement Return
              </div>
              <div className="text-lg">
                {(ASSUMPTIONS.RETIREMENT_RETURN * 100).toFixed(0)}%
              </div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded">
              <div className="font-semibold text-gray-700">
                Safe Withdrawal Rate
              </div>
              <div className="text-lg">
                {(ASSUMPTIONS.SAFE_WITHDRAWAL_RATE * 100).toFixed(0)}%
              </div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded">
              <div className="font-semibold text-gray-700">Life Expectancy</div>
              <div className="text-lg">{ASSUMPTIONS.LIFE_EXPECTANCY} years</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
