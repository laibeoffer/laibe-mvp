import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { execFileSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { EventEmitter, once } from "node:events";
import { existsSync, readFileSync } from "node:fs";
import {
  createServer as createHttpServer,
  request as httpRequest,
} from "node:http";
import { connect as connectPipe } from "node:net";
import process from "node:process";
import { PassThrough } from "node:stream";
import test from "node:test";
import { setImmediate } from "node:timers";

import {
  classifyDockerRequestTarget,
  createDockerLoopbackProxyServer,
  createTaskPipeCapability,
  rewriteContainerCreateRequest,
  rewriteProjectHelperCreateRequest,
  runDockerCliWithLoopbackProxy,
} from "../scripts/a17-docker-loopback-api-proxy.mjs";

const root = new URL("../", import.meta.url);
const baseline = "d0571b467b0f75439a7773b300febbcfe8069cd1";
const confirmationName = "A17_S1AR_RUNTIME_CONFIRMED";
const confirmationValue =
  "A17_S1AR_DISPOSABLE_LOCAL_RUNTIME_CONFIRMED_20260827_V1";

const exactSeven = Object.freeze([
  "scripts/a17-docker-loopback-api-proxy.mjs",
  "scripts/test-drs-secure-session-runtime-live-w1.ps1",
  "supabase/functions/_shared/drs-auth/drs-secure-session-runtime.ts",
  "supabase/tests/drs_secure_session_runtime_composition_w1.test.mjs",
  "supabase/tests/drs_secure_session_runtime_live_pg_w1.sql",
  "supabase/tests/drs_secure_session_runtime_live_w1.test.mjs",
  "tests/drs-secure-session-runtime-live-source.test.mjs",
]);

const protectedExactThree = Object.freeze({
  "supabase/functions/drs-session-bootstrap/index.ts":
    "d74d2471621ba64803d2b4491f513224b10f6aea953ec68a5e1569d733fb0c51",
  "supabase/migrations/20260827140000_drs_secure_session_runtime_composition_w1.sql":
    "d9cb5a30b0197f26c840021ec6d9c7b589248470daf083a09995a971399aac9e",
  "tests/drs-secure-session-runtime-source.test.mjs":
    "4e5b178b7415d49bc02bbe2bf393e83e1f4903066b1a047b47609f8a7d285829",
});

const urls = Object.freeze({
  proxy: new URL(
    "scripts/a17-docker-loopback-api-proxy.mjs",
    root,
  ),
  powershell: new URL(
    "scripts/test-drs-secure-session-runtime-live-w1.ps1",
    root,
  ),
  sql: new URL(
    "supabase/tests/drs_secure_session_runtime_live_pg_w1.sql",
    root,
  ),
  deno: new URL(
    "supabase/tests/drs_secure_session_runtime_live_w1.test.mjs",
    root,
  ),
});

function source(url) {
  assert.equal(existsSync(url), true, `${url.pathname} must exist`);
  return readFileSync(url, "utf8");
}

function sha256(url) {
  return createHash("sha256").update(readFileSync(url)).digest("hex");
}

function occurrences(value, pattern) {
  return value.match(pattern)?.length ?? 0;
}

function assertOrdered(value, needles, label) {
  let cursor = -1;
  for (const needle of needles) {
    const next = value.indexOf(needle, cursor + 1);
    assert.notEqual(next, -1, `${label}: missing ${needle}`);
    assert.equal(next > cursor, true, `${label}: out of order ${needle}`);
    cursor = next;
  }
}

const windowsPowerShellParser = String
  .raw`C:\WINDOWS\System32\WindowsPowerShell\v1.0\powershell.exe`;
const nativePowerShellAstBridge = String.raw`
$ErrorActionPreference = 'Stop'
$source = [Console]::In.ReadToEnd()
function Get-OwnerFunctionName {
  param([System.Management.Automation.Language.Ast]$Node)
  $owner = $Node.Parent
  while ($null -ne $owner -and $owner -isnot [System.Management.Automation.Language.FunctionDefinitionAst]) {
    $owner = $owner.Parent
  }
  if ($null -eq $owner) { return $null }
  return $owner.Name
}
function Get-AstLeafFacts {
  param([System.Management.Automation.Language.Ast]$Node)
  $variables = @($Node.FindAll({
    param($item) $item -is [System.Management.Automation.Language.VariableExpressionAst]
  }, $true) | ForEach-Object {
    [ordered]@{ text = $_.Extent.Text; path = $_.VariablePath.UserPath; splatted = $_.Splatted }
  })
  $members = @($Node.FindAll({
    param($item) $item -is [System.Management.Automation.Language.MemberExpressionAst]
  }, $true) | ForEach-Object { $_.Extent.Text })
  $literals = @($Node.FindAll({
    param($item)
    $item -is [System.Management.Automation.Language.StringConstantExpressionAst] -or
      $item -is [System.Management.Automation.Language.ExpandableStringExpressionAst]
  }, $true) | ForEach-Object {
    [ordered]@{ type = $_.GetType().Name; text = $_.Extent.Text; value = $_.Value }
  })
  return [ordered]@{ variables = $variables; members = $members; literals = $literals }
}
$tokens = $null
$parseErrors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseInput($source, [ref]$tokens, [ref]$parseErrors)
$functions = @($ast.FindAll({
  param($item) $item -is [System.Management.Automation.Language.FunctionDefinitionAst]
}, $true) | ForEach-Object {
  $function = $_
  [ordered]@{
    name = $function.Name
    parameters = if ($null -eq $function.Body.ParamBlock) { @() } else { @($function.Body.ParamBlock.Parameters | ForEach-Object { $_.Name.VariablePath.UserPath }) }
    start = $function.Extent.StartOffset
    end = $function.Extent.EndOffset
    bodyStart = $function.Body.Extent.StartOffset
    bodyEnd = $function.Body.Extent.EndOffset
  }
})
$variableReferences = @($ast.FindAll({
  param($item) $item -is [System.Management.Automation.Language.VariableExpressionAst]
}, $true) | ForEach-Object {
  [ordered]@{
    owner = Get-OwnerFunctionName -Node $_
    start = $_.Extent.StartOffset
    end = $_.Extent.EndOffset
    text = $_.Extent.Text
    path = $_.VariablePath.UserPath
  }
})
$invokeClosedProcessBodyGraphs = @($ast.FindAll({
  param($item)
  $item -is [System.Management.Automation.Language.FunctionDefinitionAst] -and
    $item.Name -ieq 'Invoke-ClosedProcess'
}, $true) | ForEach-Object {
  $function = $_
  $bodyStart = $function.Body.Extent.StartOffset
  $statements = @($function.Body.FindAll({
    param($item) $item -is [System.Management.Automation.Language.StatementAst]
  }, $true) | Sort-Object { $_.Extent.StartOffset }, { $_.Extent.EndOffset }, { $_.GetType().Name } | ForEach-Object {
    $statement = $_
    $parentStatement = $statement.Parent
    while (
      $null -ne $parentStatement -and
      $parentStatement -ne $function -and
      $parentStatement -isnot [System.Management.Automation.Language.StatementAst]
    ) {
      $parentStatement = $parentStatement.Parent
    }
    if ($parentStatement -eq $function) { $parentStatement = $null }
    [ordered]@{
      type = $statement.GetType().Name
      relativeStart = $statement.Extent.StartOffset - $bodyStart
      relativeEnd = $statement.Extent.EndOffset - $bodyStart
      parentType = if ($null -eq $parentStatement) { $null } else { $parentStatement.GetType().Name }
      parentRelativeStart = if ($null -eq $parentStatement) { $null } else { $parentStatement.Extent.StartOffset - $bodyStart }
      parentRelativeEnd = if ($null -eq $parentStatement) { $null } else { $parentStatement.Extent.EndOffset - $bodyStart }
      text = $statement.Extent.Text
    }
  })
  [ordered]@{
    name = $function.Name
    bodyType = $function.Body.GetType().Name
    bodyText = $function.Body.Extent.Text
    statements = $statements
  }
})
$assertOwnedRuntimeStateBodyGraphs = @($ast.FindAll({
  param($item)
  $item -is [System.Management.Automation.Language.FunctionDefinitionAst] -and
    $item.Name -ieq 'Assert-OwnedRuntimeState'
}, $true) | ForEach-Object {
  $function = $_
  $bodyStart = $function.Body.Extent.StartOffset
  $statements = @($function.Body.FindAll({
    param($item) $item -is [System.Management.Automation.Language.StatementAst]
  }, $true) | Sort-Object { $_.Extent.StartOffset }, { $_.Extent.EndOffset }, { $_.GetType().Name } | ForEach-Object {
    $statement = $_
    $parentStatement = $statement.Parent
    while (
      $null -ne $parentStatement -and
      $parentStatement -ne $function -and
      $parentStatement -isnot [System.Management.Automation.Language.StatementAst]
    ) {
      $parentStatement = $parentStatement.Parent
    }
    if ($parentStatement -eq $function) { $parentStatement = $null }
    [ordered]@{
      type = $statement.GetType().Name
      relativeStart = $statement.Extent.StartOffset - $bodyStart
      relativeEnd = $statement.Extent.EndOffset - $bodyStart
      parentType = if ($null -eq $parentStatement) { $null } else { $parentStatement.GetType().Name }
      parentRelativeStart = if ($null -eq $parentStatement) { $null } else { $parentStatement.Extent.StartOffset - $bodyStart }
      parentRelativeEnd = if ($null -eq $parentStatement) { $null } else { $parentStatement.Extent.EndOffset - $bodyStart }
      text = $statement.Extent.Text
    }
  })
  [ordered]@{
    name = $function.Name
    bodyType = $function.Body.GetType().Name
    bodyText = $function.Body.Extent.Text
    statements = $statements
  }
})
$commands = @($ast.FindAll({
  param($item) $item -is [System.Management.Automation.Language.CommandAst]
}, $true) | ForEach-Object {
  $command = $_
  $elements = @($command.CommandElements | ForEach-Object {
    $element = $_
    $facts = Get-AstLeafFacts -Node $element
    [ordered]@{
      type = $element.GetType().Name
      start = $element.Extent.StartOffset
      end = $element.Extent.EndOffset
      text = $element.Extent.Text
      parameter = if ($element -is [System.Management.Automation.Language.CommandParameterAst]) { $element.ParameterName } else { $null }
      parameterArgument = if ($element -is [System.Management.Automation.Language.CommandParameterAst] -and $null -ne $element.Argument) { $element.Argument.Extent.Text } else { $null }
      splatted = if ($element -is [System.Management.Automation.Language.VariableExpressionAst]) { $element.Splatted } else { $false }
      variables = $facts.variables
      members = $facts.members
      literals = $facts.literals
    }
  })
  [ordered]@{
    name = $command.GetCommandName()
    operator = $command.InvocationOperator.ToString()
    owner = Get-OwnerFunctionName -Node $command
    start = $command.Extent.StartOffset
    end = $command.Extent.EndOffset
    text = $command.Extent.Text
    elements = $elements
  }
})
$pipelines = @($ast.FindAll({
  param($item) $item -is [System.Management.Automation.Language.PipelineAst]
}, $true) | ForEach-Object {
  $pipeline = $_
  $facts = Get-AstLeafFacts -Node $pipeline
  [ordered]@{
    owner = Get-OwnerFunctionName -Node $pipeline
    start = $pipeline.Extent.StartOffset
    end = $pipeline.Extent.EndOffset
    text = $pipeline.Extent.Text
    variables = $facts.variables
    members = $facts.members
    elements = @($pipeline.PipelineElements | ForEach-Object {
      [ordered]@{
        type = $_.GetType().Name
        start = $_.Extent.StartOffset
        end = $_.Extent.EndOffset
        text = $_.Extent.Text
      }
    })
  }
})
$assignments = @($ast.FindAll({
  param($item) $item -is [System.Management.Automation.Language.AssignmentStatementAst]
}, $true) | ForEach-Object {
  $assignment = $_
  $leftFacts = Get-AstLeafFacts -Node $assignment.Left
  $rightFacts = Get-AstLeafFacts -Node $assignment.Right
  [ordered]@{
    owner = Get-OwnerFunctionName -Node $assignment
    start = $assignment.Extent.StartOffset
    end = $assignment.Extent.EndOffset
    leftType = $assignment.Left.GetType().Name
    left = $assignment.Left.Extent.Text
    leftVariable = if ($assignment.Left -is [System.Management.Automation.Language.VariableExpressionAst]) { $assignment.Left.VariablePath.UserPath } else { $null }
    leftVariables = $leftFacts.variables
    leftMembers = $leftFacts.members
    rightType = $assignment.Right.GetType().Name
    rightText = $assignment.Right.Extent.Text
    rightStart = $assignment.Right.Extent.StartOffset
    rightEnd = $assignment.Right.Extent.EndOffset
    rightVariables = $rightFacts.variables
    rightMembers = $rightFacts.members
  }
})
$memberInvocations = @($ast.FindAll({
  param($item) $item -is [System.Management.Automation.Language.InvokeMemberExpressionAst]
}, $true) | ForEach-Object {
  $invocation = $_
  $facts = Get-AstLeafFacts -Node $invocation
  $expressionFacts = Get-AstLeafFacts -Node $invocation.Expression
  [ordered]@{
    owner = Get-OwnerFunctionName -Node $invocation
    start = $invocation.Extent.StartOffset
    end = $invocation.Extent.EndOffset
    text = $invocation.Extent.Text
    expressionType = $invocation.Expression.GetType().Name
    expressionText = $invocation.Expression.Extent.Text
    memberText = $invocation.Member.Extent.Text
    memberValue = if ($invocation.Member -is [System.Management.Automation.Language.StringConstantExpressionAst]) { $invocation.Member.Value } else { $null }
    static = $invocation.Static
    arguments = @($invocation.Arguments | ForEach-Object { $_.Extent.Text })
    expressionVariables = $expressionFacts.variables
    expressionMemberValues = @($invocation.Expression.FindAll({
      param($item) $item -is [System.Management.Automation.Language.MemberExpressionAst]
    }, $true) | ForEach-Object {
      if ($_.Member -is [System.Management.Automation.Language.StringConstantExpressionAst]) { $_.Member.Value } else { $null }
    })
    variables = $facts.variables
    members = $facts.members
  }
})
$foreachStatements = @($ast.FindAll({
  param($item) $item -is [System.Management.Automation.Language.ForEachStatementAst]
}, $true) | ForEach-Object {
  $conditionFacts = Get-AstLeafFacts -Node $_.Condition
  [ordered]@{
    owner = Get-OwnerFunctionName -Node $_
    start = $_.Extent.StartOffset
    end = $_.Extent.EndOffset
    variable = $_.Variable.VariablePath.UserPath
    condition = $_.Condition.Extent.Text
    conditionVariables = $conditionFacts.variables
    conditionStart = $_.Condition.Extent.StartOffset
    conditionEnd = $_.Condition.Extent.EndOffset
    bodyStart = $_.Body.Extent.StartOffset
    bodyEnd = $_.Body.Extent.EndOffset
    bodyText = $_.Body.Extent.Text
    bodyStatementCount = @($_.Body.Statements).Count
    bodyStatementTypes = @($_.Body.Statements | ForEach-Object { $_.GetType().Name }) -join ','
  }
})
$startInfoEnvironmentStatements = @($ast.FindAll({
  param($item)
  if ($item -isnot [System.Management.Automation.Language.MemberExpressionAst]) { return $false }
  if ($item.Member -isnot [System.Management.Automation.Language.StringConstantExpressionAst]) { return $false }
  if ($item.Member.Value -ine 'Environment') { return $false }
  return @($item.Expression.FindAll({
    param($child)
    $child -is [System.Management.Automation.Language.VariableExpressionAst] -and
      $child.VariablePath.UserPath -ieq 'startInfo'
  }, $true)).Count -gt 0
}, $true) | ForEach-Object {
  $statement = $_
  while ($null -ne $statement -and $statement -isnot [System.Management.Automation.Language.StatementAst]) {
    $statement = $statement.Parent
  }
  if ($null -ne $statement) {
    [ordered]@{
      owner = Get-OwnerFunctionName -Node $statement
      start = $statement.Extent.StartOffset
      end = $statement.Extent.EndOffset
      type = $statement.GetType().Name
      text = $statement.Extent.Text
    }
  }
})
$hashtables = @($ast.FindAll({
  param($item) $item -is [System.Management.Automation.Language.HashtableAst]
}, $true) | ForEach-Object {
  $table = $_
  [ordered]@{
    owner = Get-OwnerFunctionName -Node $table
    start = $table.Extent.StartOffset
    end = $table.Extent.EndOffset
    entries = @($table.KeyValuePairs | ForEach-Object {
      [ordered]@{ key = $_.Item1.Extent.Text; value = $_.Item2.Extent.Text }
    })
  }
})
$returns = @($ast.FindAll({
  param($item) $item -is [System.Management.Automation.Language.ReturnStatementAst]
}, $true) | ForEach-Object {
  [ordered]@{ owner = Get-OwnerFunctionName -Node $_; text = $_.Pipeline.Extent.Text }
})
$result = [ordered]@{
  parseErrors = @($parseErrors | ForEach-Object { $_.Message })
  functions = $functions
  variableReferences = $variableReferences
  invokeClosedProcessBodyGraphs = $invokeClosedProcessBodyGraphs
  assertOwnedRuntimeStateBodyGraphs = $assertOwnedRuntimeStateBodyGraphs
  commands = $commands
  pipelines = $pipelines
  assignments = $assignments
  memberInvocations = $memberInvocations
  foreachStatements = $foreachStatements
  startInfoEnvironmentStatements = $startInfoEnvironmentStatements
  hashtables = $hashtables
  returns = $returns
}
[Console]::Out.Write(($result | ConvertTo-Json -Compress -Depth 14))
`;

const allowedStaticPowerShellCommands = new Set([
  "ConvertFrom-Json",
  "ForEach-Object",
  "Get-FileHash",
  "Get-NetTCPConnection",
  "Get-Process",
  "Join-Path",
  "Remove-Item",
  "Sort-Object",
  "Split-Path",
  "Test-Path",
  "Where-Object",
  "Write-Output",
]);

const exactSupabaseImageRecords = Object.freeze([
  {
    sourceLiteral: "supabase/postgres:17.6.1.143",
    ref: "public.ecr.aws/supabase/postgres:17.6.1.143",
    imageId:
      "sha256:80d7b27c3e8d77cfa7226eee9508671796da214781ff15a35b3670d7ad5ee453",
    repoDigest:
      "public.ecr.aws/supabase/postgres@sha256:80d7b27c3e8d77cfa7226eee9508671796da214781ff15a35b3670d7ad5ee453",
  },
  {
    sourceLiteral: "supabase/gotrue:v2.192.0",
    ref: "public.ecr.aws/supabase/gotrue:v2.192.0",
    imageId:
      "sha256:b252efb680be37d4a8bf77c210cf0439c19b63a4b51929233a65dd101d25bdab",
    repoDigest:
      "public.ecr.aws/supabase/gotrue@sha256:b252efb680be37d4a8bf77c210cf0439c19b63a4b51929233a65dd101d25bdab",
  },
  {
    sourceLiteral: "postgrest/postgrest:v14.14",
    ref: "public.ecr.aws/supabase/postgrest:v14.14",
    imageId:
      "sha256:d2009b5c9deffc210c8a5592698472fede14fd9f6ca89823c8474ca54d58c012",
    repoDigest:
      "public.ecr.aws/supabase/postgrest@sha256:d2009b5c9deffc210c8a5592698472fede14fd9f6ca89823c8474ca54d58c012",
  },
  {
    sourceLiteral: "library/kong:2.8.1",
    ref: "public.ecr.aws/supabase/kong:2.8.1",
    imageId:
      "sha256:1b53405d8680a09d6f44494b7990bf7da2ea43f84a258c59717d4539abf09f6d",
    repoDigest:
      "public.ecr.aws/supabase/kong@sha256:1b53405d8680a09d6f44494b7990bf7da2ea43f84a258c59717d4539abf09f6d",
  },
]);

function parseNativePowerShellAst(ps) {
  assert.equal(typeof ps, "string", "native parser input must be text");
  assert.equal(
    ps.length > 0 && ps.length <= 1024 * 1024,
    true,
    "native parser input bound",
  );
  assert.doesNotMatch(ps, /\0/u, "native parser input rejects NUL");
  let output;
  try {
    output = execFileSync(
      windowsPowerShellParser,
      [
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        nativePowerShellAstBridge,
      ],
      {
        input: ps,
        encoding: "utf8",
        timeout: 10_000,
        maxBuffer: 8 * 1024 * 1024,
        windowsHide: true,
        env: {
          ComSpec: String.raw`C:\WINDOWS\System32\cmd.exe`,
          SystemRoot: String.raw`C:\WINDOWS`,
          WINDIR: String.raw`C:\WINDOWS`,
        },
      },
    );
  } catch {
    assert.fail("native PowerShell Parser.ParseInput bridge failed");
  }
  let parsed;
  try {
    parsed = JSON.parse(output);
  } catch {
    assert.fail(
      "native PowerShell Parser.ParseInput bridge emitted invalid JSON",
    );
  }
  assert.deepEqual(
    parsed.parseErrors,
    [],
    "PowerShell source must parse without errors",
  );
  return parsed;
}

function normalizePowerShellAstText(value) {
  return value.replace(/\s+/gu, " ").trim();
}

function commandParameters(command) {
  const parameters = new Map();
  const positional = [];
  for (let index = 1; index < command.elements.length; index += 1) {
    const element = command.elements[index];
    if (element.type !== "CommandParameterAst") {
      positional.push(element);
      continue;
    }
    assert.equal(
      element.parameterArgument,
      null,
      `${command.name}: colon parameter arguments forbidden`,
    );
    assert.equal(
      parameters.has(element.parameter),
      false,
      `${command.name}: duplicate -${element.parameter}`,
    );
    let value = null;
    const next = command.elements[index + 1];
    if (next && next.type !== "CommandParameterAst") {
      value = next;
      index += 1;
    }
    parameters.set(element.parameter, value);
  }
  assert.deepEqual(
    positional,
    [],
    `${command.name}: positional or dynamic elements forbidden`,
  );
  return parameters;
}

function powerShellReachability(ast) {
  const functions = new Map();
  for (const definition of ast.functions) {
    const key = definition.name.toLowerCase();
    assert.equal(
      functions.has(key),
      false,
      `duplicate function definition: ${definition.name}`,
    );
    functions.set(key, definition);
  }

  for (const command of ast.commands) {
    assert.equal(
      ["Unknown", "Ampersand", "Dot"].includes(command.operator),
      true,
      `unsupported invocation operator: ${command.operator}`,
    );
    assert.equal(
      command.elements.some((element) => element.splatted),
      false,
      "PowerShell command splatting is forbidden",
    );
    if (command.name !== null) {
      const isFunction = functions.has(command.name.toLowerCase());
      const isAllowedStatic = allowedStaticPowerShellCommands.has(command.name);
      assert.equal(
        isFunction || isAllowedStatic,
        true,
        `unknown or alias command: ${command.name}`,
      );
      if (!isFunction) {
        assert.equal(
          command.operator,
          "Unknown",
          `external call operator forbidden: ${command.name}`,
        );
      }
    }
  }

  const unresolved = ast.commands.filter((command) => command.name === null);
  assert.equal(
    unresolved.length,
    4,
    "exactly four unresolved terminateProcessTree invocations",
  );
  const unresolvedShapes = unresolved.map((command) => ({
    owner: command.owner,
    operator: command.operator,
    first: command.elements[0]?.text,
    text: normalizePowerShellAstText(command.text),
  }));
  assert.deepEqual(
    unresolvedShapes,
    [
      {
        owner: "Invoke-ClosedProcess",
        operator: "Ampersand",
        first: "$terminateProcessTree",
        text: "& $terminateProcessTree $false",
      },
      {
        owner: "Invoke-ClosedProcess",
        operator: "Ampersand",
        first: "$terminateProcessTree",
        text: "& $terminateProcessTree $false",
      },
      {
        owner: "Invoke-ClosedProcess",
        operator: "Ampersand",
        first: "$terminateProcessTree",
        text: "& $terminateProcessTree $false",
      },
      {
        owner: "Invoke-ClosedProcess",
        operator: "Ampersand",
        first: "$terminateProcessTree",
        text: "& $terminateProcessTree -exited $false",
      },
    ],
    "only the exact terminateProcessTree scriptblock calls are unresolved",
  );

  const reachableFunctions = new Set();
  const queue = [];
  const admitCallsFrom = (owner) => {
    for (const command of ast.commands) {
      if (command.owner !== owner || command.name === null) continue;
      const key = command.name.toLowerCase();
      if (functions.has(key) && !reachableFunctions.has(key)) {
        reachableFunctions.add(key);
        queue.push(functions.get(key).name);
      }
    }
  };
  admitCallsFrom(null);
  while (queue.length !== 0) admitCallsFrom(queue.shift());
  return {
    functionNames: reachableFunctions,
    commands: ast.commands.filter(
      (command) =>
        command.owner === null ||
        reachableFunctions.has(command.owner.toLowerCase()),
    ),
  };
}

function assertNativePowerShellSecurityContract(ps) {
  const ast = parseNativePowerShellAst(ps);
  const reachability = powerShellReachability(ast);
  const reachable = reachability.commands;
  const isReachableOwner = (owner) =>
    owner === null || reachability.functionNames.has(owner.toLowerCase());
  const reachableMemberInvocations = ast.memberInvocations.filter((
    invocation,
  ) => isReachableOwner(invocation.owner));
  const normalizedCommandName = (command) =>
    command.name?.toLowerCase() ?? null;
  const closedCalls = reachable.filter((command) =>
    normalizedCommandName(command) === "invoke-closedprocess"
  );
  const gitCalls = reachable.filter((command) =>
    normalizedCommandName(command) === "invoke-gitidentity"
  );
  assert.equal(
    closedCalls.length,
    15,
    "exact reachable Invoke-ClosedProcess call count",
  );
  assert.equal(
    gitCalls.length,
    9,
    "exact reachable Invoke-GitIdentity call count",
  );

  const reachableStartAndAddInvocations = reachableMemberInvocations
    .filter((invocation) =>
      ["start", "add"].includes(invocation.memberValue?.toLowerCase())
    )
    .map((invocation) => ({
      owner: invocation.owner?.toLowerCase() ?? null,
      receiverVariables: invocation.expressionVariables.map((variable) =>
        variable.path.toLowerCase()
      ),
      receiverMembers: invocation.expressionMemberValues.map((member) =>
        member.toLowerCase()
      ),
      member: invocation.memberValue.toLowerCase(),
      static: invocation.static,
      arguments: invocation.arguments,
    }));
  assert.deepEqual(
    reachableStartAndAddInvocations,
    [
      {
        owner: "invoke-closedprocess",
        receiverVariables: ["startinfo"],
        receiverMembers: ["argumentlist"],
        member: "add",
        static: false,
        arguments: ["$argument"],
      },
      {
        owner: "invoke-closedprocess",
        receiverVariables: ["process"],
        receiverMembers: [],
        member: "start",
        static: false,
        arguments: [null],
      },
      ...[
        "'A17_S1AR_DENO_SQL_AUTH_CLEANUP_READBACK_FAILED'",
        "'A17_S1AR_EXACT_STOP_FAILED'",
        "'A17_S1AR_DOCKER_READBACK_FAILED'",
        "'A17_S1AR_LISTENER_READBACK_FAILED'",
        "'A17_S1AR_CHILD_ROOT_CLEAN_FAILED'",
        "'A17_S1AR_SOURCE_IDENTITY_READBACK_FAILED'",
      ].map((argument) => ({
        owner: null,
        receiverVariables: ["cleanuperrors"],
        receiverMembers: [],
        member: "add",
        static: false,
        arguments: [argument],
      })),
      ...[
        "$primaryResult",
        "'A17_S1AR_PRIMARY_FAILED_CLEANUP_CONFIRMED'",
        "$primaryResult",
        "'A17_S1AR_CLEANUP_FAILED'",
        '"PRIMARY=$primaryError"',
        '"CLEANUP=$cleanupError"',
      ].map((argument) => ({
        owner: null,
        receiverVariables: ["trace"],
        receiverMembers: [],
        member: "add",
        static: false,
        arguments: [argument],
      })),
    ],
    "reachable Start/Add invocations are an exact case-insensitive semantic whitelist",
  );

  const closedAllowed = new Set([
    "FilePath",
    "Arguments",
    "WorkingDirectory",
    "Environment",
    "StandardInput",
    "AllowFailure",
    "FailureCode",
  ]);
  const closedDetails = closedCalls.map((command) => {
    const parameters = commandParameters(command);
    for (const name of parameters.keys()) {
      assert.equal(
        closedAllowed.has(name),
        true,
        `Invoke-ClosedProcess parameter abbreviation: -${name}`,
      );
    }
    for (
      const required of [
        "FilePath",
        "Arguments",
        "WorkingDirectory",
        "FailureCode",
      ]
    ) {
      assert.notEqual(
        parameters.get(required),
        null,
        `Invoke-ClosedProcess requires -${required}`,
      );
      assert.equal(
        parameters.has(required),
        true,
        `Invoke-ClosedProcess requires -${required}`,
      );
    }
    return { command, parameters, arguments: parameters.get("Arguments") };
  });
  const gitDetails = gitCalls.map((command) => {
    const parameters = commandParameters(command);
    assert.deepEqual(
      [...parameters.keys()],
      ["Arguments", "FailureCode"],
      "Invoke-GitIdentity exact parameters",
    );
    assert.notEqual(
      parameters.get("Arguments"),
      null,
      "Invoke-GitIdentity requires arguments",
    );
    assert.notEqual(
      parameters.get("FailureCode"),
      null,
      "Invoke-GitIdentity requires failure code",
    );
    return { command, parameters, arguments: parameters.get("Arguments") };
  });

  const variableArgumentFlows = closedDetails.filter(
    (detail) => detail.arguments.type === "VariableExpressionAst",
  );
  assert.deepEqual(
    variableArgumentFlows.map((detail) => ({
      owner: detail.command.owner,
      text: detail.arguments.text,
    })),
    [
      { owner: "Assert-NoOwnedDockerResources", text: "$query" },
      { owner: "Invoke-GitIdentity", text: "$Arguments" },
    ],
    "only Git propagation and the exact queries loop may supply a whole argument variable",
  );
  assert.equal(
    closedDetails.every((detail) =>
      ["ArrayExpressionAst", "VariableExpressionAst"].includes(
        detail.arguments.type,
      )
    ),
    true,
    "closed process arguments must be an AST array or an admitted dataflow variable",
  );
  assert.equal(
    gitDetails.every((detail) =>
      detail.arguments.type === "ArrayExpressionAst"
    ),
    true,
    "Git identity arguments must be exact AST arrays",
  );

  const memberFlows = closedDetails.flatMap((detail) =>
    detail.arguments.members.map((member) => ({
      owner: detail.command.owner,
      member,
    }))
  );
  assert.deepEqual(
    memberFlows,
    [{ owner: "Assert-LocalImageCache", member: "$record.ref" }],
    "only the exact image record ref member may flow into process arguments",
  );

  const gitWrapper = closedDetails.filter(
    (detail) => detail.command.owner === "Invoke-GitIdentity",
  );
  assert.equal(gitWrapper.length, 1, "one Git wrapper propagation call");
  assert.deepEqual(
    [...gitWrapper[0].parameters.entries()].map((
      [name, value],
    ) => [name, value?.text ?? null]),
    [
      ["FilePath", "$script:gitExecutable"],
      ["Arguments", "$Arguments"],
      ["WorkingDirectory", "$script:worktreeRoot"],
      ["FailureCode", "$FailureCode"],
    ],
    "Git wrapper propagates only its exact arguments and failure code",
  );
  const gitDefinition = ast.functions.filter((definition) =>
    definition.name === "Invoke-GitIdentity"
  );
  assert.equal(gitDefinition.length, 1);
  assert.deepEqual(gitDefinition[0].parameters, ["Arguments", "FailureCode"]);

  const protectedDataflowVariables = new Set([
    "arguments",
    "queries",
    "query",
    "expectedimages",
    "record",
  ]);
  const protectedPaths = (facts) => [
    ...new Set(
      facts
        .map((fact) => fact.path)
        .filter((path) => protectedDataflowVariables.has(path.toLowerCase())),
    ),
  ];
  const reachableProtectedAssignments = ast.assignments
    .filter((assignment) => isReachableOwner(assignment.owner))
    .map((assignment) => ({
      assignment,
      leftProtected: protectedPaths(assignment.leftVariables),
      rightProtected: protectedPaths(assignment.rightVariables),
    }))
    .filter(({ leftProtected, rightProtected }) =>
      leftProtected.length !== 0 || rightProtected.length !== 0
    );
  assert.deepEqual(
    reachableProtectedAssignments.map((
      { assignment, leftProtected, rightProtected },
    ) => ({
      owner: assignment.owner,
      leftType: assignment.leftType,
      left: assignment.left,
      rightType: assignment.rightType,
      leftProtected,
      rightProtected,
    })),
    [
      {
        owner: "Get-ExactSupabaseImageRecords",
        leftType: "VariableExpressionAst",
        left: "$expectedImages",
        rightType: "CommandExpressionAst",
        leftProtected: ["expectedImages"],
        rightProtected: [],
      },
      {
        owner: "Get-ExactSupabaseImageRecords",
        leftType: "VariableExpressionAst",
        left: "$firstIndex",
        rightType: "CommandExpressionAst",
        leftProtected: [],
        rightProtected: ["record"],
      },
      {
        owner: "Get-ExactSupabaseImageRecords",
        leftType: "VariableExpressionAst",
        left: "$lastIndex",
        rightType: "CommandExpressionAst",
        leftProtected: [],
        rightProtected: ["record"],
      },
      {
        owner: "Assert-NoOwnedDockerResources",
        leftType: "VariableExpressionAst",
        left: "$queries",
        rightType: "CommandExpressionAst",
        leftProtected: ["queries"],
        rightProtected: [],
      },
      {
        owner: "Assert-NoOwnedDockerResources",
        leftType: "VariableExpressionAst",
        left: "$result",
        rightType: "PipelineAst",
        leftProtected: [],
        rightProtected: ["query"],
      },
      {
        owner: "Assert-LocalImageCache",
        leftType: "VariableExpressionAst",
        left: "$expectedImages",
        rightType: "PipelineAst",
        leftProtected: ["expectedImages"],
        rightProtected: [],
      },
      {
        owner: "Assert-LocalImageCache",
        leftType: "VariableExpressionAst",
        left: "$result",
        rightType: "PipelineAst",
        leftProtected: [],
        rightProtected: ["record"],
      },
    ],
    "reachable protected dataflow assignments are an exact statement whitelist",
  );

  const reachableProtectedMemberInvocations = ast.memberInvocations
    .filter((invocation) => isReachableOwner(invocation.owner))
    .map((invocation) => ({
      invocation,
      protectedVariables: protectedPaths(invocation.variables),
    }))
    .filter(({ protectedVariables }) => protectedVariables.length !== 0);
  assert.deepEqual(
    reachableProtectedMemberInvocations.map((
      { invocation, protectedVariables },
    ) => ({
      owner: invocation.owner,
      expressionType: invocation.expressionType,
      expressionText: invocation.expressionText,
      memberText: invocation.memberText,
      arguments: invocation.arguments,
      protectedVariables,
    })),
    [
      {
        owner: "Get-ExactSupabaseImageRecords",
        expressionType: "VariableExpressionAst",
        expressionText: "$ascii",
        memberText: "IndexOf",
        arguments: [
          "$record.sourceLiteral",
          "[System.StringComparison]::Ordinal",
        ],
        protectedVariables: ["record"],
      },
      {
        owner: "Get-ExactSupabaseImageRecords",
        expressionType: "VariableExpressionAst",
        expressionText: "$ascii",
        memberText: "LastIndexOf",
        arguments: [
          "$record.sourceLiteral",
          "[System.StringComparison]::Ordinal",
        ],
        protectedVariables: ["record"],
      },
    ],
    "reachable protected dataflow member invocations are an exact structural whitelist",
  );

  const queryAssignments = ast.assignments.filter(
    (assignment) =>
      assignment.owner === "Assert-NoOwnedDockerResources" &&
      assignment.leftVariable === "queries",
  );
  assert.equal(queryAssignments.length, 1, "one exact queries assignment");
  assert.equal(
    normalizePowerShellAstText(queryAssignments[0].rightText),
    normalizePowerShellAstText(String.raw`@(
      @('ps', '-a', '--filter', "name=$ProjectId", '--format', '{{.ID}} {{.Names}}'),
      @('network', 'ls', '--filter', "name=$ProjectId", '--format', '{{.ID}} {{.Name}}'),
      @('volume', 'ls', '--filter', "name=$ProjectId", '--format', '{{.Name}}')
    )`),
    "exact three Docker resource queries",
  );
  const queryLoops = ast.foreachStatements.filter(
    (loop) =>
      loop.owner === "Assert-NoOwnedDockerResources" &&
      loop.variable === "query",
  );
  assert.deepEqual(
    queryLoops.map((loop) => loop.condition),
    ["$queries"],
    "exact query variable iterates the exact queries assignment",
  );
  const queryLoopCalls = closedDetails.filter(
    (detail) =>
      detail.command.start > queryLoops[0].bodyStart &&
      detail.command.end < queryLoops[0].bodyEnd,
  );
  assert.equal(
    queryLoopCalls.length,
    1,
    "one closed process call inside exact queries loop",
  );
  assert.equal(queryLoopCalls[0].arguments.text, "$query");

  const imageAssignments = ast.assignments.filter(
    (assignment) =>
      assignment.owner === "Get-ExactSupabaseImageRecords" &&
      assignment.leftVariable === "expectedImages",
  );
  assert.equal(imageAssignments.length, 1, "one exact image-record assignment");
  const imageTables = ast.hashtables.filter(
    (table) =>
      table.owner === "Get-ExactSupabaseImageRecords" &&
      table.start >= imageAssignments[0].rightStart &&
      table.end <= imageAssignments[0].rightEnd,
  );
  const imageRecords = imageTables.map((table) =>
    Object.fromEntries(table.entries.map((entry) => {
      assert.match(
        entry.value,
        /^'[^']*'$/u,
        `image ${entry.key} must be a literal`,
      );
      return [entry.key, entry.value.slice(1, -1)];
    }))
  );
  assert.deepEqual(
    imageRecords,
    exactSupabaseImageRecords,
    "exact four immutable image records",
  );
  assert.deepEqual(
    ast.returns.filter((item) => item.owner === "Get-ExactSupabaseImageRecords")
      .map((item) => item.text),
    ["$expectedImages"],
    "image record function returns only the exact mapping",
  );
  const cacheAssignments = ast.assignments.filter(
    (assignment) =>
      assignment.owner === "Assert-LocalImageCache" &&
      assignment.leftVariable === "expectedImages",
  );
  assert.deepEqual(
    cacheAssignments.map((assignment) =>
      normalizePowerShellAstText(assignment.rightText)
    ),
    ["Get-ExactSupabaseImageRecords"],
    "local cache consumes the exact four-record mapping",
  );
  const recordLoops = ast.foreachStatements.filter(
    (loop) =>
      loop.owner === "Assert-LocalImageCache" && loop.variable === "record",
  );
  assert.deepEqual(recordLoops.map((loop) => loop.condition), [
    "$expectedImages",
  ]);
  const recordLoopCalls = closedDetails.filter(
    (detail) =>
      detail.command.start > recordLoops[0].bodyStart &&
      detail.command.end < recordLoops[0].bodyEnd,
  );
  assert.equal(
    recordLoopCalls.length,
    1,
    "one image inspect call inside exact record loop",
  );
  assert.equal(
    normalizePowerShellAstText(recordLoopCalls[0].arguments.text),
    "@('image', 'inspect', '--format', '{{.Id}}|{{json .RepoTags}}|{{json .RepoDigests}}', $record.ref)",
  );

  const firstLiteral = (detail) => detail.arguments.literals[0]?.value;
  const directArchive = closedDetails.filter((detail) =>
    firstLiteral(detail) === "archive"
  );
  const wrapperArchive = gitDetails.filter((detail) =>
    firstLiteral(detail) === "archive"
  );
  assert.equal(
    directArchive.length + wrapperArchive.length,
    1,
    "one reachable archive producer",
  );
  assert.equal(
    directArchive.length,
    1,
    "archive producer is the direct closed process call",
  );
  assert.equal(
    wrapperArchive.length,
    0,
    "Git wrapper never produces an archive",
  );
  assert.deepEqual(
    [...directArchive[0].parameters.entries()].map((
      [name, value],
    ) => [name, value?.text ?? null]),
    [
      ["FilePath", "$gitExecutable"],
      [
        "Arguments",
        "@('archive', 'HEAD', '--format=tar', \"--output=$archivePath\", '--', 'supabase')",
      ],
      ["WorkingDirectory", "$worktreeRoot"],
      ["FailureCode", "'A17_S1AR_GIT_ARCHIVE_FAILED'"],
    ],
    "one exact direct Supabase-only archive producer",
  );
  const tarExtract = closedDetails.filter((detail) =>
    firstLiteral(detail) === "-xf"
  );
  assert.equal(tarExtract.length, 1, "one reachable tar extractor");
  assert.deepEqual(
    [...tarExtract[0].parameters.entries()].map((
      [name, value],
    ) => [name, value?.text ?? null]),
    [
      ["FilePath", "$tarExecutable"],
      ["Arguments", "@('-xf', $archivePath, '-C', $runtimeRoot)"],
      ["WorkingDirectory", "$runtimeRoot"],
      ["FailureCode", "'A17_S1AR_ARCHIVE_EXTRACT_FAILED'"],
    ],
    "one exact tar extractor",
  );
  return ast;
}

function assertExactSupabaseCliEnvironment(ps, nativeAst = null) {
  const ast = nativeAst ?? parseNativePowerShellAst(ps);
  const reachability = powerShellReachability(ast);
  const closedCalls = reachability.commands.filter((command) =>
    command.name?.toLowerCase() === "invoke-closedprocess"
  );
  const closedDetails = closedCalls.map((command) => ({
    command,
    parameters: commandParameters(command),
  }));
  const supabaseCliDetails = closedDetails.filter(({ parameters }) => {
    const filePath = parameters.get("FilePath");
    const argumentsValue = parameters.get("Arguments");
    return filePath?.variables.length === 1 &&
      filePath.variables[0].path.toLowerCase() === "nodeexecutable" &&
      argumentsValue?.literals[0]?.value === "--supabase-executable" &&
      argumentsValue?.literals[1]?.value === "--project-id" &&
      argumentsValue?.literals[2]?.value === "--";
  }).map(({ command, parameters }) => {
    const filePath = parameters.get("FilePath");
    const argumentsValue = parameters.get("Arguments");
    const environment = parameters.get("Environment");
    assert.notEqual(
      argumentsValue,
      null,
      "Supabase CLI arguments are required",
    );
    assert.notEqual(environment, null, "Supabase CLI environment is required");
    return {
      command,
      parameters,
      filePath,
      argumentsValue,
      environment,
      action: argumentsValue.literals[3]?.value ?? null,
      argumentVariables: argumentsValue.variables.map((variable) =>
        variable.path.toLowerCase()
      ),
    };
  });
  assert.deepEqual(
    supabaseCliDetails.map((detail) => ({
      owner: detail.command.owner,
      action: detail.action,
      filePathType: detail.filePath.type,
      filePathVariables: detail.filePath.variables.map((variable) =>
        variable.path.toLowerCase()
      ),
      environmentType: detail.environment.type,
      environmentVariables: detail.environment.variables.map((variable) =>
        variable.path.toLowerCase()
      ),
    })),
    [
      {
        owner: "Invoke-ExactProjectStopCleanup",
        action: "stop",
        filePathType: "VariableExpressionAst",
        filePathVariables: ["nodeexecutable"],
        environmentType: "HashtableAst",
        environmentVariables: ["systemrootpath"],
      },
      {
        owner: null,
        action: "start",
        filePathType: "VariableExpressionAst",
        filePathVariables: ["nodeexecutable"],
        environmentType: "VariableExpressionAst",
        environmentVariables: ["supabaseprocessenvironment"],
      },
      {
        owner: null,
        action: "status",
        filePathType: "VariableExpressionAst",
        filePathVariables: ["nodeexecutable"],
        environmentType: "VariableExpressionAst",
        environmentVariables: ["supabaseprocessenvironment"],
      },
    ],
    "every reachable Supabase CLI child uses the one admitted environment route",
  );
  assert.deepEqual(
    supabaseCliDetails.map((detail) => ({
      action: detail.action,
      variables: detail.argumentVariables,
    })),
    [
      {
        action: "stop",
        variables: [
          "dockerloopbackproxypath",
          "supabaseexecutable",
          "projectid",
          "projectid",
        ],
      },
      {
        action: "start",
        variables: [
          "dockerloopbackproxypath",
          "supabaseexecutable",
          "projectid",
          "runtimeroot",
        ],
      },
      {
        action: "status",
        variables: [
          "dockerloopbackproxypath",
          "supabaseexecutable",
          "projectid",
          "runtimeroot",
        ],
      },
    ],
    "every Supabase child is routed through the exact proxy prelude",
  );

  const exactEnvironmentEntries = [
    { key: "DO_NOT_TRACK", value: "'1'" },
    { key: "SUPABASE_TELEMETRY_DISABLED", value: "'1'" },
    { key: "SystemRoot", value: "$SystemRootPath" },
  ];
  const systemRootWrites = ast.assignments.filter((assignment) =>
    assignment.leftVariables.some((variable) =>
      variable.path.toLowerCase() === "systemrootpath"
    )
  );
  assert.deepEqual(
    systemRootWrites.map((assignment) => ({
      owner: assignment.owner,
      leftType: assignment.leftType,
      leftVariable: assignment.leftVariable,
      rightText: assignment.rightText,
    })),
    [
      {
        owner: null,
        leftType: "VariableExpressionAst",
        leftVariable: "SystemRootPath",
        rightText: "'C:\\WINDOWS'",
      },
    ],
    "SystemRoot is one exact nonsecret immutable binding",
  );

  const sharedEnvironmentWrites = ast.assignments.filter((assignment) =>
    assignment.leftVariables.some((variable) =>
      variable.path.toLowerCase() === "supabaseprocessenvironment"
    )
  );
  assert.equal(
    sharedEnvironmentWrites.length,
    1,
    "one shared Supabase CLI environment assignment",
  );
  assert.equal(
    sharedEnvironmentWrites[0].leftVariable,
    "supabaseProcessEnvironment",
    "shared Supabase CLI environment is a direct scalar assignment",
  );
  const sharedTables = ast.hashtables.filter((table) =>
    table.start === sharedEnvironmentWrites[0].rightStart &&
    table.end === sharedEnvironmentWrites[0].rightEnd
  );
  assert.equal(sharedTables.length, 1, "shared environment is one hashtable");
  assert.deepEqual(
    sharedTables[0].entries,
    exactEnvironmentEntries,
    "start and status receive only telemetry suppression plus exact SystemRoot",
  );
  assert.deepEqual(
    ast.memberInvocations.filter((invocation) =>
      invocation.variables.some((variable) =>
        variable.path.toLowerCase() === "supabaseprocessenvironment"
      )
    ),
    [],
    "shared Supabase CLI environment is never mutated through a member call",
  );

  const stopDetail = supabaseCliDetails.find((detail) =>
    detail.action === "stop"
  );
  assert.notEqual(stopDetail, undefined, "exact stop cleanup is reachable");
  const stopTables = ast.hashtables.filter((table) =>
    table.start === stopDetail.environment.start &&
    table.end === stopDetail.environment.end
  );
  assert.equal(
    stopTables.length,
    1,
    "stop environment is one inline hashtable",
  );
  assert.deepEqual(
    stopTables[0].entries,
    exactEnvironmentEntries,
    "stop cleanup receives only telemetry suppression plus exact SystemRoot",
  );

  const cleanupDefinitions = ast.functions
    .filter((definition) =>
      definition.name.toLowerCase() === "invoke-exactprojectstopcleanup"
    )
    .map((definition) => ({
      name: definition.name,
      parameters: Array.isArray(definition.parameters)
        ? definition.parameters
        : definition.parameters === null ||
            (typeof definition.parameters === "object" &&
              Object.keys(definition.parameters).length === 0)
        ? []
        : [definition.parameters],
    }));
  assert.deepEqual(
    cleanupDefinitions,
    [{ name: "Invoke-ExactProjectStopCleanup", parameters: [] }],
    "exact stop cleanup has one canonical definition and no parameters",
  );
  const variableLeaf = (path) => path.toLowerCase().split(":").at(-1);
  const cleanupSystemRootBindings = [
    ...ast.assignments
      .filter((assignment) =>
        assignment.owner?.toLowerCase() ===
          "invoke-exactprojectstopcleanup" &&
        assignment.leftVariables.some((variable) =>
          variableLeaf(variable.path) === "systemrootpath"
        )
      )
      .map((assignment) => ({
        kind: "assignment",
        text: normalizePowerShellAstText(assignment.left),
      })),
    ...ast.foreachStatements
      .filter((statement) =>
        statement.owner?.toLowerCase() ===
          "invoke-exactprojectstopcleanup" &&
        variableLeaf(statement.variable) === "systemrootpath"
      )
      .map((statement) => ({
        kind: "loop",
        text: statement.variable,
      })),
  ];
  assert.deepEqual(
    cleanupSystemRootBindings,
    [],
    "exact stop cleanup cannot shadow SystemRootPath through assignment or loop binding",
  );

  const wrapperOwner = "invoke-closedprocess";
  const wrapperProtectedInputs = new Set(["environment", "entry"]);
  const protectedInputPaths = (variables) => [
    ...new Set(
      variables
        .map((variable) => variableLeaf(variable.path))
        .filter((path) => wrapperProtectedInputs.has(path)),
    ),
  ];
  const wrapperDefinitions = ast.functions.filter((definition) =>
    definition.name.toLowerCase() === wrapperOwner
  );
  assert.equal(
    wrapperDefinitions.length,
    1,
    "Invoke-ClosedProcess has one canonical definition",
  );
  assert.deepEqual(
    ast.invokeClosedProcessBodyGraphs.map((graph) => ({
      name: graph.name,
      bodyType: graph.bodyType,
      statementCount: graph.statements.length,
      sha256: createHash("sha256")
        .update(JSON.stringify(graph))
        .digest("hex"),
    })),
    [
      {
        name: "Invoke-ClosedProcess",
        bodyType: "ScriptBlockAst",
        statementCount: 222,
        sha256:
          "6f51c7e71f2a12a71fb5b1f1d90b000c79216b389eb78da9e62a60587ddec0cc",
      },
    ],
    "Invoke-ClosedProcess full native-AST statement graph and body are exactly whitelisted",
  );
  const wrapperDefinition = wrapperDefinitions[0];
  const nestedWrapperFunctions = ast.functions.filter((definition) =>
    definition.start > wrapperDefinition.bodyStart &&
    definition.end < wrapperDefinition.bodyEnd
  );
  assert.deepEqual(
    nestedWrapperFunctions.map((definition) => definition.name.toLowerCase()),
    [],
    "Invoke-ClosedProcess cannot define nested functions that capture wrapper inputs",
  );
  const customFunctionNames = new Set(
    ast.functions.map((definition) => definition.name.toLowerCase()),
  );
  const wrapperCustomFunctionCalls = ast.commands
    .filter((command) =>
      command.owner?.toLowerCase() === wrapperOwner &&
      command.name !== null &&
      customFunctionNames.has(command.name.toLowerCase())
    )
    .map((command) => ({
      name: command.name.toLowerCase(),
      text: normalizePowerShellAstText(command.text),
    }));
  assert.deepEqual(
    wrapperCustomFunctionCalls,
    Array.from({ length: 3 }, () => ({
      name: "get-remainingprocessdeadlinemilliseconds",
      text:
        "Get-RemainingProcessDeadlineMilliseconds -ProcessDeadline $processDeadline -ProcessTimeoutMilliseconds $ProcessTimeoutMilliseconds",
    })),
    "Invoke-ClosedProcess custom-function calls are exactly whitelisted",
  );
  const forbiddenAutomaticEnvironmentAliases = ast.variableReferences
    .filter((variable) =>
      variable.owner?.toLowerCase() === wrapperOwner &&
      ["psboundparameters", "myinvocation"].includes(
        variableLeaf(variable.path),
      )
    )
    .map((variable) => ({
      path: variableLeaf(variable.path),
      text: normalizePowerShellAstText(variable.text),
    }));
  assert.deepEqual(
    forbiddenAutomaticEnvironmentAliases,
    [],
    "Invoke-ClosedProcess cannot alias Environment through PowerShell automatic bound-parameter variables",
  );
  const wrapperProtectedAssignments = ast.assignments
    .filter((assignment) => assignment.owner?.toLowerCase() === wrapperOwner)
    .map((assignment) => ({
      assignment,
      leftProtected: protectedInputPaths(assignment.leftVariables),
      rightProtected: protectedInputPaths(assignment.rightVariables),
    }))
    .filter(({ leftProtected, rightProtected }) =>
      leftProtected.length !== 0 || rightProtected.length !== 0
    );
  assert.deepEqual(
    wrapperProtectedAssignments.map((
      { assignment, leftProtected, rightProtected },
    ) => ({
      leftType: assignment.leftType,
      left: normalizePowerShellAstText(assignment.left),
      rightType: assignment.rightType,
      rightText: normalizePowerShellAstText(assignment.rightText),
      leftProtected,
      rightProtected,
    })),
    [
      {
        leftType: "IndexExpressionAst",
        left: "$startInfo.Environment[$entry.Key]",
        rightType: "CommandExpressionAst",
        rightText: "[string]$entry.Value",
        leftProtected: ["entry"],
        rightProtected: ["entry"],
      },
    ],
    "wrapper Environment and entry assignments have one exact protected dataflow",
  );

  const wrapperProtectedPipelines = ast.pipelines.filter((pipeline) =>
    pipeline.owner?.toLowerCase() === wrapperOwner &&
    protectedInputPaths(pipeline.variables).length !== 0
  );
  assert.deepEqual(
    wrapperProtectedPipelines.map((pipeline) => ({
      text: normalizePowerShellAstText(pipeline.text),
      protectedInputs: protectedInputPaths(pipeline.variables),
    })),
    [
      {
        text: "$Environment.GetEnumerator()",
        protectedInputs: ["environment"],
      },
    ],
    "protected wrapper inputs have only the canonical GetEnumerator pipeline",
  );
  const wrapperProtectedPipelineCommands = ast.commands.filter((command) =>
    command.owner?.toLowerCase() === wrapperOwner &&
    wrapperProtectedPipelines.some((pipeline) =>
      command.start >= pipeline.start && command.end <= pipeline.end
    )
  );
  assert.deepEqual(
    wrapperProtectedPipelineCommands,
    [],
    "the canonical protected-input pipeline contains no command or alias stage",
  );

  const wrapperEnvironmentStatements = [...new Map(
    ast.startInfoEnvironmentStatements
      .filter((statement) => statement.owner?.toLowerCase() === wrapperOwner)
      .map((statement) => [`${statement.start}:${statement.end}`, statement]),
  ).values()];
  assert.deepEqual(
    wrapperEnvironmentStatements.map((statement) => ({
      type: statement.type,
      text: normalizePowerShellAstText(statement.text),
    })),
    [
      {
        type: "CommandExpressionAst",
        text: "$startInfo.Environment.Clear()",
      },
      {
        type: "AssignmentStatementAst",
        text: "$startInfo.Environment[$entry.Key] = [string]$entry.Value",
      },
    ],
    "every statement that accesses startInfo.Environment is exactly whitelisted",
  );

  const wrapperEnvironmentMemberMutations = ast.memberInvocations
    .filter((invocation) =>
      invocation.owner?.toLowerCase() === wrapperOwner &&
      invocation.expressionVariables.some((variable) =>
        variableLeaf(variable.path) === "startinfo"
      ) &&
      invocation.expressionMemberValues.some((member) =>
        member?.toLowerCase() === "environment"
      )
    )
    .map((invocation) => ({
      start: invocation.start,
      end: invocation.end,
      expressionType: invocation.expressionType,
      expressionText: invocation.expressionText,
      member: invocation.memberValue?.toLowerCase() ?? null,
      static: invocation.static,
      arguments: invocation.arguments,
    }));
  assert.deepEqual(
    wrapperEnvironmentMemberMutations.map((invocation) => ({
      expressionType: invocation.expressionType,
      expressionText: invocation.expressionText,
      member: invocation.member,
      static: invocation.static,
      arguments: invocation.arguments,
    })),
    [
      {
        expressionType: "MemberExpressionAst",
        expressionText: "$startInfo.Environment",
        member: "clear",
        static: false,
        arguments: [null],
      },
    ],
    "startInfo.Environment has exactly one Clear member invocation",
  );

  const wrapperProtectedMemberInvocations = ast.memberInvocations
    .filter((invocation) =>
      invocation.owner?.toLowerCase() === wrapperOwner &&
      protectedInputPaths(invocation.variables).length !== 0
    );
  assert.deepEqual(
    wrapperProtectedMemberInvocations.map((invocation) => ({
      expressionType: invocation.expressionType,
      expressionText: invocation.expressionText,
      member: invocation.memberValue?.toLowerCase() ?? null,
      static: invocation.static,
      arguments: invocation.arguments,
      protectedInputs: protectedInputPaths(invocation.variables),
    })),
    [
      {
        expressionType: "VariableExpressionAst",
        expressionText: "$Environment",
        member: "getenumerator",
        static: false,
        arguments: [null],
        protectedInputs: ["environment"],
      },
    ],
    "protected wrapper inputs cannot flow through any other member invocation",
  );
  const environmentEnumeratorInvocations = wrapperProtectedMemberInvocations
    .filter((invocation) =>
      invocation.memberValue?.toLowerCase() === "getenumerator" &&
      protectedInputPaths(invocation.expressionVariables).includes(
        "environment",
      )
    );
  assert.equal(
    environmentEnumeratorInvocations.length,
    1,
    "Environment.GetEnumerator is invoked exactly once",
  );
  const wrapperProtectedLoops = ast.foreachStatements.filter((statement) =>
    statement.owner?.toLowerCase() === wrapperOwner &&
    (wrapperProtectedInputs.has(variableLeaf(statement.variable)) ||
      protectedInputPaths(statement.conditionVariables).length !== 0)
  );
  assert.deepEqual(
    wrapperProtectedLoops.map((statement) => ({
      variable: statement.variable,
      condition: normalizePowerShellAstText(statement.condition),
      protectedConditionInputs: protectedInputPaths(
        statement.conditionVariables,
      ),
      bodyStatementCount: statement.bodyStatementCount,
      bodyStatementTypes: statement.bodyStatementTypes,
      bodyText: normalizePowerShellAstText(statement.bodyText),
    })),
    [
      {
        variable: "entry",
        condition: "$Environment.GetEnumerator()",
        protectedConditionInputs: ["environment"],
        bodyStatementCount: 1,
        bodyStatementTypes: "AssignmentStatementAst",
        bodyText:
          "{ $startInfo.Environment[$entry.Key] = [string]$entry.Value }",
      },
    ],
    "the protected Environment-to-entry copy loop has one exact body statement",
  );
  const environmentCopyLoops = ast.foreachStatements.filter((statement) =>
    statement.owner?.toLowerCase() === wrapperOwner &&
    normalizePowerShellAstText(statement.condition) ===
      "$Environment.GetEnumerator()"
  );
  assert.deepEqual(
    environmentCopyLoops.map((statement) => ({
      variable: statement.variable,
      condition: normalizePowerShellAstText(statement.condition),
    })),
    [
      {
        variable: "entry",
        condition: "$Environment.GetEnumerator()",
      },
    ],
    "one exact Environment.GetEnumerator copy loop is admitted",
  );
  const copyAssignments = ast.assignments.filter((assignment) =>
    assignment.owner?.toLowerCase() === wrapperOwner &&
    normalizePowerShellAstText(assignment.left) ===
      "$startInfo.Environment[$entry.Key]"
  );
  assert.deepEqual(
    copyAssignments.map((assignment) => ({
      leftType: assignment.leftType,
      left: normalizePowerShellAstText(assignment.left),
      rightType: assignment.rightType,
      rightText: normalizePowerShellAstText(assignment.rightText),
    })),
    [
      {
        leftType: "IndexExpressionAst",
        left: "$startInfo.Environment[$entry.Key]",
        rightType: "CommandExpressionAst",
        rightText: "[string]$entry.Value",
      },
    ],
    "the copy loop has one exact startInfo.Environment assignment",
  );
  const clearInvocation = wrapperEnvironmentMemberMutations[0];
  const copyLoop = environmentCopyLoops[0];
  const enumeratorInvocation = environmentEnumeratorInvocations[0];
  const copyAssignment = copyAssignments[0];
  assert.equal(
    clearInvocation.end <= copyLoop.start,
    true,
    "Environment.Clear precedes the environment copy loop",
  );
  assert.equal(
    enumeratorInvocation.start >= copyLoop.conditionStart &&
      enumeratorInvocation.end <= copyLoop.conditionEnd,
    true,
    "the exact GetEnumerator invocation is the copy-loop condition",
  );
  assert.equal(
    copyAssignment.start >= copyLoop.bodyStart &&
      copyAssignment.end <= copyLoop.bodyEnd,
    true,
    "the exact environment assignment is contained by the copy loop",
  );

  const closedProcessStart = ps.indexOf("function Invoke-ClosedProcess");
  const closedProcessEnd = ps.indexOf(
    "function ConvertTo-base64url43",
    closedProcessStart,
  );
  const closedProcess = ps.slice(closedProcessStart, closedProcessEnd);
  assert.doesNotMatch(
    closedProcess,
    /\$env:|GetEnvironmentVariables?|\b(?:PATH|HOME|USERPROFILE|PROFILE)\b/iu,
    "the closed child wrapper does not inherit profile or discovery state",
  );
  assertOrdered(
    ps,
    [
      "$SystemRootPath = 'C:\\WINDOWS'",
      "Test-Path -LiteralPath $SystemRootPath -PathType Container",
      "[System.IO.Path]::GetFullPath($SystemRootPath).TrimEnd(",
      ") -cne $SystemRootPath -or",
      "[System.IO.Path]::GetFullPath((Join-Path $SystemRootPath 'system32\\tar.exe')) -cne $TarExecutablePath",
      "throw 'A17_S1AR_SYSTEM_ROOT_REJECTED'",
      "$tarExecutable = $TarExecutablePath",
      'Assert-SourceIdentity -Stage "pre-start"',
      "$supabaseProcessEnvironment = @{",
    ],
    "exact SystemRoot is canonically bound to the admitted Windows tool path before runtime start",
  );
}

function assertExactSupabaseStartExclusions(ps) {
  const ast = parseNativePowerShellAst(ps);
  const reachability = powerShellReachability(ast);
  assertExactOwnedRuntimeStateGraph(ast);
  const startCalls = reachability.commands
    .filter((command) => command.name?.toLowerCase() === "invoke-closedprocess")
    .map((command) => ({ command, parameters: commandParameters(command) }))
    .filter(({ parameters }) => {
      const filePath = parameters.get("FilePath");
      const argumentsValue = parameters.get("Arguments");
      return filePath?.variables.length === 1 &&
        filePath.variables[0].path.toLowerCase() === "nodeexecutable" &&
        argumentsValue?.literals[0]?.value === "--supabase-executable" &&
        argumentsValue?.literals[1]?.value === "--project-id" &&
        argumentsValue?.literals[2]?.value === "--" &&
        argumentsValue?.literals[3]?.value === "start";
    });
  assert.equal(startCalls.length, 1, "one reachable Supabase start child");
  const startArguments = startCalls[0].parameters.get("Arguments");
  assert.deepEqual(
    startArguments.literals.map((literal) => literal.value),
    [
      "--supabase-executable",
      "--project-id",
      "--",
      "start",
      "--workdir",
      "--exclude",
      "studio,imgproxy,mailpit,storage-api,realtime,edge-runtime,logflare,vector,supavisor,postgres-meta",
    ],
    "Supabase start excludes mailpit and every other non-admitted service",
  );
  assert.deepEqual(
    startArguments.variables.map((variable) => variable.path.toLowerCase()),
    [
      "dockerloopbackproxypath",
      "supabaseexecutable",
      "projectid",
      "runtimeroot",
    ],
    "Supabase start uses only the exact runtime-root argument variable",
  );

  const expectedContainerAssignments = ast.assignments.filter((assignment) =>
    assignment.owner === "Assert-OwnedRuntimeState" &&
    assignment.leftVariable === "expectedContainers"
  );
  assert.equal(
    expectedContainerAssignments.length,
    1,
    "one exact expected-container assignment",
  );
  assert.equal(
    normalizePowerShellAstText(expectedContainerAssignments[0].rightText),
    normalizePowerShellAstText(
      '@("supabase_auth_$ProjectId", "supabase_db_$ProjectId", "supabase_kong_$ProjectId", "supabase_rest_$ProjectId") | Sort-Object',
    ),
    "runtime acceptance remains the exact four admitted containers",
  );

  const normalizedVariableLeaf = (variable) =>
    variable.toLowerCase().split(":").at(-1);
  const normalizedVariables = (variables) =>
    variables.map((variable) => normalizedVariableLeaf(variable.path));
  const ownedRuntimeAssignments = ast.assignments.filter((assignment) =>
    assignment.owner?.toLowerCase() === "assert-ownedruntimestate"
  );
  const expectedVolumeVariables = new Set(["expectedvolumes"]);
  let expectedVolumeAliasAdded;
  do {
    expectedVolumeAliasAdded = false;
    for (const assignment of ownedRuntimeAssignments) {
      const rightVariables = normalizedVariables(assignment.rightVariables);
      if (
        !rightVariables.some((variable) =>
          expectedVolumeVariables.has(variable)
        )
      ) continue;
      for (const variable of normalizedVariables(assignment.leftVariables)) {
        if (expectedVolumeVariables.has(variable)) continue;
        expectedVolumeVariables.add(variable);
        expectedVolumeAliasAdded = true;
      }
    }
  } while (expectedVolumeAliasAdded);
  const expectedVolumeAssignments = ownedRuntimeAssignments
    .filter((assignment) =>
      [...assignment.leftVariables, ...assignment.rightVariables].some(
        (variable) =>
          expectedVolumeVariables.has(normalizedVariableLeaf(variable.path)),
      )
    )
    .map((assignment) => ({
      owner: assignment.owner.toLowerCase(),
      leftType: assignment.leftType,
      leftVariable: assignment.leftVariable === null
        ? null
        : normalizedVariableLeaf(assignment.leftVariable),
      leftVariables: normalizedVariables(assignment.leftVariables),
      rightType: assignment.rightType,
      rightText: normalizePowerShellAstText(assignment.rightText),
      rightVariables: normalizedVariables(assignment.rightVariables),
    }));
  assert.deepEqual(
    expectedVolumeAssignments,
    [
      {
        owner: "assert-ownedruntimestate",
        leftType: "VariableExpressionAst",
        leftVariable: "expectedvolumes",
        leftVariables: ["expectedvolumes"],
        rightType: "PipelineAst",
        rightText: normalizePowerShellAstText(
          '@("supabase_db_$ProjectId") | Sort-Object',
        ),
        rightVariables: ["projectid"],
      },
    ],
    "runtime acceptance admits one exact db-volume assignment and no alias dataflow",
  );
  const isReachableOwner = (owner) =>
    owner === null || reachability.functionNames.has(owner.toLowerCase());
  assert.deepEqual(
    ast.memberInvocations.filter((invocation) =>
      isReachableOwner(invocation.owner) &&
      invocation.variables.some((variable) =>
        expectedVolumeVariables.has(normalizedVariableLeaf(variable.path))
      )
    ),
    [],
    "expectedVolumes and its aliases have zero reachable member invocations",
  );
}

function assertExactOwnedRuntimeStateGraph(ast) {
  assert.deepEqual(
    ast.assertOwnedRuntimeStateBodyGraphs.map((graph) => ({
      name: graph.name,
      bodyType: graph.bodyType,
      statementCount: graph.statements.length,
      sha256: createHash("sha256")
        .update(JSON.stringify(graph))
        .digest("hex"),
    })),
    [
      {
        name: "Assert-OwnedRuntimeState",
        bodyType: "ScriptBlockAst",
        statementCount: 98,
        sha256:
          "e2f89685a18754e59ded300caa7a40a89ebcf02d7195834ff959e4f360abc17e",
      },
    ],
    "Assert-OwnedRuntimeState full native-AST statement graph and body are exactly whitelisted",
  );
}

function assertExactSupabaseArchiveBlock(ps) {
  const archiveStartMarker =
    "$archivePath = Assert-ExactDescendant -Root $runtimeRoot -Candidate (Join-Path $runtimeRoot '.git-archive-head.tar')";
  const archiveEndMarker = "Remove-Item -LiteralPath $archivePath -Force";
  assert.equal(
    typeof ps,
    "string",
    "archive validator requires full PowerShell source",
  );
  assert.equal(
    ps.split(archiveStartMarker).length - 1,
    1,
    "exact archive start marker must occur once",
  );
  assert.equal(
    ps.split(archiveEndMarker).length - 1,
    1,
    "exact archive removal marker must occur once",
  );
  const archiveStart = ps.indexOf(archiveStartMarker);
  const archiveEnd = ps.indexOf(archiveEndMarker);
  assert.equal(archiveEnd > archiveStart, true, "archive block bounds");
  const archiveBlock = ps.slice(
    archiveStart,
    archiveEnd + archiveEndMarker.length,
  );
  const exactGitArchive =
    "Invoke-ClosedProcess -FilePath $gitExecutable -Arguments @('archive', 'HEAD', '--format=tar', \"--output=$archivePath\", '--', 'supabase') -WorkingDirectory $worktreeRoot -FailureCode 'A17_S1AR_GIT_ARCHIVE_FAILED'";
  const exactTarExtractor =
    "Invoke-ClosedProcess -FilePath $tarExecutable -Arguments @('-xf', $archivePath, '-C', $runtimeRoot) -WorkingDirectory $runtimeRoot -FailureCode 'A17_S1AR_ARCHIVE_EXTRACT_FAILED'";

  assert.equal(
    occurrences(archiveBlock, /\$gitExecutable\b/gu),
    1,
    "bounded archive block must reference gitExecutable once",
  );
  assert.equal(
    occurrences(archiveBlock, /\$tarExecutable\b/gu),
    1,
    "bounded archive block must reference tarExecutable once",
  );
  assert.equal(
    occurrences(archiveBlock, /\bInvoke-ClosedProcess\b/gu),
    2,
    "bounded archive block must contain exactly producer and extractor",
  );
  assert.equal(
    archiveBlock.split(exactGitArchive).length - 1,
    1,
    "exact Git producer must occur once",
  );
  assert.equal(
    archiveBlock.split(exactTarExtractor).length - 1,
    1,
    "exact Tar extractor must occur once",
  );
  assert.doesNotMatch(
    archiveBlock,
    /['"][^'"]*[*?][^'"]*['"]|\$[A-Za-z_][A-Za-z0-9_]*pathspec\b|['"](?:docs?|src|ui|app|public)['"]|--(?:encoding|locale)\b|charset\b|\b(?:LC_ALL|LANG)\b|Expand-Archive|\b7z(?:\.exe)?\b|\bbsdtar\b|System\.IO\.Compression/iu,
    "archive block rejects additive scope, locale, and extractor mutations",
  );

  const nativeAst = assertNativePowerShellSecurityContract(ps);
  assertExactOwnedRuntimeStateGraph(nativeAst);
  assertExactSupabaseCliEnvironment(ps, nativeAst);
}

test("focused RED: the exact three live harness seams exist", () => {
  assert.equal(existsSync(urls.powershell), true, urls.powershell.pathname);
  assert.equal(existsSync(urls.sql), true, urls.sql.pathname);
  assert.equal(existsSync(urls.deno), true, urls.deno.pathname);
});

test("candidate changes are exact-seven and accepted exact-three bytes remain immutable", () => {
  const trackedChanged = execFileSync(
    "git",
    ["diff", "--name-only", baseline, "--"],
    { cwd: root, encoding: "utf8" },
  ).trim().split(/\r?\n/u).filter(Boolean).sort();
  const untrackedChanged = execFileSync(
    "git",
    ["ls-files", "--others", "--exclude-standard"],
    { cwd: root, encoding: "utf8" },
  ).trim().split(/\r?\n/u).filter(Boolean).sort();
  const changed = [...new Set([...trackedChanged, ...untrackedChanged])].sort();
  assert.deepEqual(changed, [...exactSeven].sort());

  for (const [path, expected] of Object.entries(protectedExactThree)) {
    assert.equal(sha256(new URL(path, root)), expected, path);
  }
});

test("PowerShell orchestrator binds immutable tools, archive child, ports and exact owned resources", () => {
  const ps = source(urls.powershell);
  for (
    const marker of [
      ".a17-s1ar-runtime",
      "git archive HEAD",
      "a17-s1ar-20260827",
      "v2.116.0",
      "777fd6d651101226cf5d67775d803518c5e94912772c3f936a458353b58ec9d1",
      "C:\\Users\\J\\scoop\\apps\\supabase\\current\\supabase.exe",
      "22c0f28f013411c7a7b880116cd33636edb955a64278914692eea010bcc98dc7",
      "C:\\Users\\J\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin\\docker.exe",
      "DockerExecutableSha256",
      "54320..54329",
      "58017",
      "DO_NOT_TRACK",
      "SUPABASE_TELEMETRY_DISABLED",
      "SupabaseEdgeRuntimeContainerAcceptance = $false",
      "RUNTIME_VERDICT=NEEDS_REWORK",
    ]
  ) assert.equal(ps.includes(marker), true, marker);

  assert.match(ps, /System\.Diagnostics\.ProcessStartInfo/u);
  assert.match(ps, /\.Environment\.Clear\(\)/u);
  assert.match(ps, /RedirectStandardOutput\s*=\s*\$true/u);
  assert.match(ps, /RedirectStandardError\s*=\s*\$true/u);
  assert.match(ps, /UseShellExecute\s*=\s*\$false/u);
  assert.match(ps, /ReadToEndAsync\(\)/u);
  assert.match(ps, /Assert-ExactDescendant/u);
  assert.match(ps, /Get-NetTCPConnection/u);
  assert.match(ps, /docker[\s\S]*ps[\s\S]*a17-s1ar-20260827/iu);
  assert.match(ps, /docker[\s\S]*image[\s\S]*inspect/iu);
  assert.match(ps, /supabase[\s\S]*start/iu);
  assert.match(
    ps,
    /supabase[\s\S]*stop[\s\S]*--project-id[\s\S]*a17-s1ar-20260827/iu,
  );
  assert.match(ps, /finally\s*\{/iu);
  assert.match(ps, /Remove-Item[\s\S]*\.a17-s1ar-runtime/iu);
});

test("orchestrator uses exact confirmation, seven production values and closed child permissions", () => {
  const ps = source(urls.powershell);
  assert.equal(occurrences(ps, new RegExp(confirmationName, "gu")) >= 2, true);
  assert.equal(ps.includes(confirmationValue), true);

  const exactProductionEnvironment = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "LAIBE_DRS_APP_ORIGIN",
    "LAIBE_DRS_SESSION_SUCCESS_URL",
    "LAIBE_DRS_SESSION_COOKIE_NAME",
    "LAIBE_DRS_SESSION_COOKIE_KEY_V1",
    "LAIBE_DRS_BFF_PROOF_KEY_V1",
  ];
  for (const name of exactProductionEnvironment) {
    assert.equal(ps.includes(name), true, name);
  }
  assert.match(ps, /https:\/\/127\.0\.0\.1:44443/u);
  assert.match(ps, /https:\/\/127\.0\.0\.1:44443\/specialist/u);
  assert.match(ps, /__Host-laibe-drs-session/u);
  assert.match(ps, /RandomNumberGenerator/u);
  assert.match(ps, /base64url43/iu);
  assert.match(ps, /LAIBE_ALLOWED_ORIGINS[\s\S]*Remove/u);
  assert.match(ps, /--allow-env=/u);
  assert.match(
    ps,
    /--allow-net=127\.0\.0\.1:54321,127\.0\.0\.1:54329,127\.0\.0\.1:58017/u,
  );
  assert.match(ps, /--allow-run=C:\\Users\\J\\AppData/u);
  assert.match(ps, /--no-config/u);
  assert.match(ps, /--cached-only/u);
  assert.match(ps, /DENO_DIR/u);
  assert.match(ps, /drs_secure_session_runtime_live_pg_w1\.sql/u);
  assert.match(ps, /drs_secure_session_runtime_live_w1\.test\.mjs/u);
  assert.match(ps, /--no-psqlrc/u);
  assert.match(ps, /--quiet/u);
  assert.match(ps, /--set=ON_ERROR_STOP=1/u);
});

test("SQL harness proves live catalog ownership, forced RLS, zero policies and closed ACLs", () => {
  const sql = source(urls.sql);
  for (
    const marker of [
      "MIG",
      "CAT",
      "RLS",
      "ACL",
      "ISS",
      "REV",
      "EXP",
      "REPLAY",
      "TAMPER",
      "JSON",
      "SAN",
      "CLEAN",
      "integration.drs_server_sessions",
      "drs_server_session_issue_v1",
      "drs_server_session_verify_v1",
      "drs_server_session_revoke_v1",
      "access_token_digest",
      "relforcerowsecurity",
      "pg_policies",
      "aclexplode",
      "service_role",
      "owner to postgres",
      "set search_path = ''",
    ]
  ) {
    assert.equal(
      sql.toLowerCase().includes(marker.toLowerCase()),
      true,
      marker,
    );
  }

  assert.match(sql, /\bbegin\s*;/iu);
  assert.match(sql, /\brollback\s*;/iu);
  assert.match(sql, /is distinct from/iu);
  assert.match(sql, /jsonb_build_object/iu);
  assert.match(sql, /jsonb_object_agg/iu);
  assert.match(sql, /delete from integration\.drs_server_sessions/iu);
  assert.match(sql, /:'a17_[a-z0-9_]+'/iu);
});

test("Deno harness is confirmation-ignored at Stage 1 and operationally binds BOOT/GUARD/ROT/LOCK/FETCH", () => {
  const deno = source(urls.deno);
  assert.equal(deno.includes(confirmationName), true);
  assert.equal(deno.includes(confirmationValue), true);
  assert.match(deno, /else\s*\{[\s\S]*ignore:\s*true/u);
  assert.match(
    deno,
    /Deno\.serve\(\{[\s\S]*hostname:\s*"127\.0\.0\.1"[\s\S]*port:\s*58017/iu,
  );
  assert.match(deno, /createDrsSecureSessionRuntime/u);
  assert.match(deno, /createDrsSessionBootstrapEndpoint/u);
  assert.match(deno, /createDrsBffGuard/u);
  assert.match(deno, /\/auth\/v1\/admin\/users/u);
  assert.match(deno, /\/auth\/v1\/token\?grant_type=password/u);
  assert.match(deno, /\/rest\/v1\/rpc\/drs_workspace_grant_v1/u);
  assert.match(deno, /ROT_BARRIER_FETCH_PAUSED/u);
  assert.match(deno, /ISSUE_BARRIER_ROW_LOCKED/u);
  assert.match(deno, /VERIFY_BARRIER_ROW_LOCKED/u);
  assert.match(deno, /REVOKE_BARRIER_ROW_LOCKED/u);
  assert.match(deno, /RUNTIME_VERDICT=NEEDS_REWORK/u);
  assert.match(deno, /clearEnv:\s*true/u);
  assert.match(deno, /--no-psqlrc/u);
  assert.match(deno, /--quiet/u);
  assert.match(deno, /--set=ON_ERROR_STOP=1/u);
  assert.match(deno, /AbortController/u);
  assert.match(deno, /reader\.cancel\(\)/u);
  assert.match(deno, /finally\s*\{/iu);
});

test("the exact-three source is fail-closed against remote, broad teardown and secret projection", () => {
  const combined = [
    source(urls.powershell),
    source(urls.sql),
    source(urls.deno),
  ]
    .join("\n");
  assert.doesNotMatch(
    combined,
    /supabase\s+(?:link|deploy|functions\s+deploy)|git\s+(?:push|merge)|gh\s+pr|docker\s+(?:system\s+prune|rm\s+-f\s+\$?\([^)]*ps)|compose\s+down|supabase\s+stop\s+--all/iu,
  );
  assert.doesNotMatch(combined, /0\.0\.0\.0|host\.docker\.internal/iu);
  assert.doesNotMatch(
    combined,
    /LAIBE_ALLOWED_ORIGINS\s*=|Access-Control-Allow-Origin['"]?\s*:\s*['"]?\*/iu,
  );
  assert.doesNotMatch(
    combined,
    /Write-(?:Host|Output)[^\n]*(?:SERVICE_ROLE|COOKIE_KEY|PROOF_KEY|SUPABASE_URL)/iu,
  );
  assert.doesNotMatch(
    combined,
    /(?:^|[\\/'"`=])\.env(?:[.\s'"`]|$)|--env-file|credential\s+dump|docker\s+inspect/imu,
  );
  assert.doesNotMatch(
    combined,
    /localStorage|sessionStorage|document\.|window\.|location\./u,
  );
  assert.doesNotMatch(combined, /https?:\/\/(?!127\.0\.0\.1)/u);
});

test("R1 runtime identity is activation-supplied, revalidated, and followed by owned-runtime proof", () => {
  const ps = source(urls.powershell);

  for (
    const parameter of [
      "ExpectedHead",
      "ExpectedTree",
      "ExpectedBranch",
      "ExpectedParent",
      "ExpectedCandidateManifest",
      "ExpectedProtectedManifest",
    ]
  ) {
    assert.match(
      ps,
      new RegExp(`\\[Parameter\\(Mandatory\\)\\][^\\n]*\\$${parameter}`, "u"),
      `activation must supply ${parameter}`,
    );
  }

  for (
    const gitIdentityCall of [
      '@("rev-parse", "HEAD")',
      '@("rev-parse", "HEAD^{tree}")',
      '@("symbolic-ref", "--short", "HEAD")',
      '@("rev-list", "--parents", "-n", "1", "HEAD")',
      '@("diff", "--cached", "--name-only")',
      '@("ls-files", "--others", "--exclude-standard")',
    ]
  ) assert.equal(ps.includes(gitIdentityCall), true, gitIdentityCall);

  assert.match(ps, /Assert-SourceIdentity\s+-Stage\s+"pre-start"/u);
  assert.match(ps, /Assert-CandidateManifest\s+-ExpectedManifest/u);
  assert.match(ps, /Assert-ProtectedManifest\s+-ExpectedManifest/u);
  for (
    const dependency of [
      "contracts.ts",
      "drs-session-bootstrap-bff.ts",
      "drs-specialist-authority.ts",
      "specialist-authorization.ts",
    ]
  ) {
    assert.equal(
      ps.includes(dependency),
      true,
      `protected dependency ${dependency}`,
    );
  }
  assert.match(ps, /Assert-OwnedRuntimeState\s+-RequireExact/u);
  assert.match(ps, /docker[\s\S]*container[\s\S]*network[\s\S]*volume/iu);
  assert.match(
    ps,
    /Get-NetTCPConnection[\s\S]*OwningProcess[\s\S]*docker[\s\S]*port/iu,
  );
  assertOrdered(
    ps,
    [
      'Assert-SourceIdentity -Stage "pre-start"',
      '\'--\', "start", "--workdir", $runtimeRoot',
      "Assert-OwnedRuntimeState -RequireExact",
      "drs_secure_session_runtime_live_pg_w1.sql",
    ],
    "identity/start/ownership/live-test order",
  );
});

test("R2 cleanup is primary-first, exhaustive, transactional, and emits one terminal", () => {
  const ps = source(urls.powershell);
  const deno = source(urls.deno);

  assertOrdered(
    ps,
    [
      "$startAttempted = $true",
      '\'--\', "start", "--workdir", $runtimeRoot',
      "$primaryResult =",
      "finally {",
      "Assert-HarnessCleanupReadback",
      "Invoke-ExactProjectStopCleanup",
      "Assert-OwnedRuntimeAbsent",
      "Assert-ListenerAbsent",
      'Assert-SourceIdentity -Stage "post-cleanup"',
      "Write-Output $terminalResult",
    ],
    "primary and cleanup state machine",
  );
  assert.equal(
    occurrences(ps, /Write-Output\s+\$terminalResult/gu),
    1,
    "orchestrator must emit exactly one terminal",
  );
  assert.match(ps, /\$preserveRuntimeRoot\s*=\s*!?\$stopSucceeded/u);
  assert.match(
    ps,
    /if\s*\(\s*-not\s+\$preserveRuntimeRoot\s*\)[\s\S]*Remove-Item/u,
  );

  for (
    const cleanupCall of [
      'attemptCleanup("server-close"',
      'attemptCleanup("db-fixture"',
      'attemptCleanup("auth-delete"',
      'attemptCleanup("auth-absence-readback"',
    ]
  ) assert.equal(deno.includes(cleanupCall), true, cleanupCall);
  assert.match(deno, /const cleanupErrors\s*=\s*\[\]/u);
  assert.match(deno, /primaryError[\s\S]*cleanupErrors/u);
  assert.match(
    deno,
    /begin;[\s\S]*set local session_replication_role = replica;[\s\S]*delete from integration\.drs_workspace_grants[\s\S]*where[\s\S]*commit;/iu,
  );
});

test("R3 SQL and Deno execute the admitted adversarial matrix instead of naming markers", () => {
  const sql = source(urls.sql);
  const deno = source(urls.deno);

  assert.match(
    sql,
    /expected_constraint_definitions\s*\([^)]*constraint_name[^)]*definition/iu,
  );
  assert.match(
    sql,
    /expected_partial_indexes\s*\([^)]*index_name[^)]*definition/iu,
  );
  assert.match(
    sql,
    /select\s+count\(\*\)[\s\S]*from expected_partial_indexes[\s\S]*is distinct from\s*3/iu,
  );
  assert.match(
    sql,
    /coalesce\([^)]*relforcerowsecurity[^)]*,\s*false\)\s+is distinct from true/iu,
  );
  assert.doesNotMatch(
    sql,
    /(?:projection|actual|value)\s*(?:<>|!=|=)\s*(?:expected|:'a17_)/iu,
  );
  for (
    const authorityCase of [
      "authorized-json-null",
      "authenticated-user-id-json-null",
      "specialist-id-json-null",
      "assignment-id-json-null",
      "selected-case-id-json-null",
      "account-role-json-null",
      "authorization-subject-json-null",
      "auth-binding-status-json-null",
      "specialist-status-json-null",
      "assignment-status-json-null",
      "valid-from-json-null",
      "valid-until-json-null",
      "lock-status-json-null",
    ]
  ) {
    assert.equal(sql.includes(authorityCase), true, authorityCase);
  }
  for (
    const authorityCase of ["invalid-status", "invalid-subject", "invalid-time"]
  ) {
    assert.equal(sql.includes(authorityCase), true, authorityCase);
  }
  assert.match(sql, /before_function_definitions[\s\S]*pg_get_functiondef/iu);
  assert.match(sql, /after_function_definitions[\s\S]*pg_get_functiondef/iu);
  assert.match(
    sql,
    /before_function_definitions[\s\S]*is distinct from[\s\S]*after_function_definitions/iu,
  );

  for (
    const executableCase of [
      "assertRevokedBootstrapAndGuard401(",
      "assertProofExpiryWithInjectedClock(",
      "assertProofReplayWithinWindow(",
      "assertProofRejectedAfterRevokeAndRotation(",
      "assertAcceptedRuntimeHostileCase(",
      "startHostileLoopbackFixture(",
      "assertIssueLockBarrier(",
      "assertVerifyLockBarrier(",
      "assertRevokeLockBarrier(",
      "assertExactCanaryAbsence(",
    ]
  ) assert.equal(deno.includes(executableCase), true, executableCase);
  for (
    const tamperCase of [
      "cookie-bit-flip",
      "proof-bit-flip",
      "wrong-cookie-key",
      "wrong-proof-key",
      "malformed-cookie",
      "malformed-proof",
      "alg-none",
    ]
  ) {
    assert.match(
      deno,
      new RegExp(
        `await\\s+assertAcceptedRuntimeTamperCase\\(\\s*"${tamperCase}"`,
        "u",
      ),
    );
  }
  assert.match(
    deno,
    /bootstrapDependencies\.accessSessionVerifier\s*\.verifyAccessSession\(/u,
  );
  assert.match(deno, /decodeSessionCookie[\s\S]*sessionId[\s\S]*accessToken/u);
  assert.match(deno, /assertPendingBeforeRelease[\s\S]*Promise\.race/iu);
  assert.match(
    deno,
    /VERIFY_BARRIER_ROW_LOCKED[\s\S]*assertPendingBeforeRelease[\s\S]*VERIFY_BARRIER_RELEASED/iu,
  );
  assert.match(
    deno,
    /assertSanitizedBodyless401[\s\S]*response\.status[\s\S]*responseBody\.byteLength/u,
  );
});

test("R4 confirmation is consumed before any accepted production module is imported", () => {
  const deno = source(urls.deno);
  assert.doesNotMatch(
    deno,
    /^import[\s\S]*from\s+["']\.\.\/functions\/(?:_shared\/drs-auth\/drs-secure-session-runtime|drs-session-bootstrap\/index)\.ts["'];/mu,
  );

  assertOrdered(
    deno,
    [
      `Deno.env.get("${confirmationName}")`,
      `Deno.env.delete("${confirmationName}")`,
      "if (runtimeConfirmed) {",
      "../functions/_shared/drs-auth/drs-session-bootstrap-bff.ts",
      "../functions/_shared/drs-auth/drs-secure-session-runtime.ts",
      "../functions/drs-session-bootstrap/index.ts",
    ],
    "confirmation deletion and confirmed-only imports",
  );
  assert.match(deno, /if\s*\(runtimeConfirmed\)\s*\{[\s\S]*Deno\.test\(/u);
  assert.match(deno, /else\s*\{[\s\S]*ignore:\s*true/u);
  assert.match(
    deno,
    /const productionEnvironment\s*=\s*exactSevenEnvironment\(/u,
  );
  assert.deepEqual(
    [
      ...new Set(
        [...deno.matchAll(/productionEnvironment\.([A-Z][A-Z0-9_]+)/gu)].map((
          m,
        ) => m[1]),
      ),
    ].sort(),
    [
      "LAIBE_DRS_APP_ORIGIN",
      "LAIBE_DRS_BFF_PROOF_KEY_V1",
      "LAIBE_DRS_SESSION_COOKIE_KEY_V1",
      "LAIBE_DRS_SESSION_COOKIE_NAME",
      "LAIBE_DRS_SESSION_SUCCESS_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL",
    ].sort(),
  );
});

test("S2-R1 protected identity is exact-twelve and listener queries fail closed", () => {
  const ps = source(urls.powershell);
  const protectedFunction = ps.slice(
    ps.indexOf("function Assert-ProtectedManifest"),
    ps.indexOf("function Assert-SourceIdentity"),
  );
  const protectedPaths = [
    ...protectedFunction.matchAll(/'(supabase\/[^']+|tests\/[^']+)'/gu),
  ]
    .map((match) => match[1])
    .sort();
  assert.deepEqual(
    protectedPaths,
    [
      "supabase/config.toml",
      "supabase/functions/_shared/drs-auth/contracts.ts",
      "supabase/functions/_shared/drs-auth/drs-secure-session-runtime.ts",
      "supabase/functions/_shared/drs-auth/drs-session-bootstrap-bff.ts",
      "supabase/functions/_shared/drs-auth/drs-specialist-authority.ts",
      "supabase/functions/_shared/drs-auth/specialist-authorization.ts",
      "supabase/functions/drs-session-bootstrap/index.ts",
      "supabase/migrations/20260824170000_drs_identity_google_line_w1.sql",
      "supabase/migrations/20260826183000_drs_workspace_grant_authority_v2.sql",
      "supabase/migrations/20260827140000_drs_secure_session_runtime_composition_w1.sql",
      "supabase/tests/drs_secure_session_runtime_composition_w1.test.mjs",
      "tests/drs-secure-session-runtime-source.test.mjs",
    ].sort(),
  );
  function assertListenerQueryFailsClosed(candidateSource) {
    const listenerStart = candidateSource.indexOf(
      "function Assert-NoOwnedListeners",
    );
    const listenerEnd = candidateSource.indexOf(
      "function Get-ExactSupabaseImageRecords",
      listenerStart,
    );
    assert.notEqual(listenerStart, -1, "listener start function must exist");
    assert.notEqual(listenerEnd, -1, "listener end function must exist");
    assert.equal(
      listenerEnd > listenerStart,
      true,
      "listener slice must be forward and nonempty",
    );
    const listenerFunction = candidateSource.slice(listenerStart, listenerEnd);
    assert.match(
      listenerFunction,
      /Get-NetTCPConnection[\s\S]*-ErrorAction\s+Stop/u,
      "listener Get-NetTCPConnection must fail closed",
    );
    assert.doesNotMatch(listenerFunction, /SilentlyContinue/u);
    assert.match(
      listenerFunction,
      /catch\s*\{[\s\S]*A17_S1AR_LISTENER_QUERY_FAILED/u,
    );
  }

  assertListenerQueryFailsClosed(ps);
  const mutatedListenerSource = ps.replace(
    "Get-NetTCPConnection -State Listen -ErrorAction Stop",
    "Get-NetTCPConnection -State Listen",
  );
  assert.notEqual(
    mutatedListenerSource,
    ps,
    "mutation must remove the listener-local flag",
  );
  const laterListenerSource = mutatedListenerSource.slice(
    mutatedListenerSource.indexOf("function Get-ExactSupabaseImageRecords"),
  );
  assert.match(
    laterListenerSource,
    /-ErrorAction\s+Stop/u,
    "mutation fixture must retain later occurrences",
  );
  assert.throws(
    () => assertListenerQueryFailsClosed(mutatedListenerSource),
    /listener Get-NetTCPConnection must fail closed/u,
  );
});

test("S2-R2 causal terminal and cleanup preserve an exact ROT or LOCK reason", () => {
  const ps = source(urls.powershell);
  const deno = source(urls.deno);
  for (
    const marker of [
      "A17_S1AR_RUNTIME_VERDICT=NEEDS_REWORK_ROT",
      "A17_S1AR_RUNTIME_VERDICT=NEEDS_REWORK_LOCK",
      "A17_S1AR_CLEANUP_CONFIRMED",
    ]
  ) assert.equal(deno.includes(marker), true, marker);
  assert.match(
    ps,
    /function Read-ExactCausalVerdict[\s\S]*Matches\([\s\S]*Count\s+-ne\s+1/u,
  );
  assert.match(ps, /A17_S1AR_CAUSAL_VERDICT_(?:MISSING|DUPLICATE|CONFLICT)/u);
  assert.doesNotMatch(ps, /PRIMARY=ROT_OR_LOCK_REPRODUCED/u);
  assert.match(ps, /A17_S1AR_RUNTIME_VERDICT=NEEDS_REWORK_(?:ROT|LOCK)/u);
  assert.match(
    deno,
    /delete from integration\.drs_workspace_grants[\s\S]*casework_case_id\s+in/iu,
  );
  assert.doesNotMatch(
    deno,
    /delete from integration\.drs_workspace_grants[\s\S]{0,300}\band case_id\s+in/iu,
  );
  assert.match(deno, /createRealAuthUser\(serviceRoleKey,\s*registerUserId\)/u);
  assertOrdered(deno, [
    "const userId = assertUserId(created?.id)",
    "registerUserId(userId)",
    "const signedIn = await fetchJson",
  ], "outer auth cleanup registration");
  assertOrdered(deno, [
    'console.log("A17_S1AR_CLEANUP_CONFIRMED")',
    "if (primaryError",
  ], "cleanup confirmation before primary rethrow");
  assert.match(ps, /A17_S1AR_PRIMARY_FAILED_CLEANUP_CONFIRMED/u);
  assert.match(ps, /A17_S1AR_CLEANUP_FAILED/u);
});

test("S2-R3 issue verify revoke lock lanes and exact column metadata are executable", () => {
  const sql = source(urls.sql);
  const deno = source(urls.deno);
  assert.match(
    sql,
    /expected_column_metadata\s*\([\s\S]*ordinal[\s\S]*column_name[\s\S]*format_type[\s\S]*attnotnull[\s\S]*default_expression[\s\S]*identity_kind[\s\S]*generated_kind/iu,
  );
  assert.match(
    sql,
    /expected_column_metadata[\s\S]*except[\s\S]*pg_attribute[\s\S]*except[\s\S]*expected_column_metadata/iu,
  );
  assert.match(sql, /coalesce\([^)]*attnotnull[^)]*,\s*false\)/iu);

  const issueLane = deno.slice(
    deno.indexOf("async function assertIssueLockBarrier"),
    deno.indexOf("async function assertVerifyLockBarrier"),
  );
  assertOrdered(issueLane, [
    "ISSUE_BARRIER_ROW_LOCKED",
    "createVerifiedSession(",
    "assertPendingBeforeRelease(issuePromise",
    "ISSUE_BARRIER_RELEASED",
    "assert.rejects(issuePromise",
  ], "issue lock lane");
  const verifyLane = deno.slice(
    deno.indexOf("async function assertVerifyLockBarrier"),
    deno.indexOf("async function assertRevokeLockBarrier"),
  );
  assertOrdered(verifyLane, [
    "VERIFY_BARRIER_ROW_LOCKED",
    "accessSessionVerifier",
    ".verifyAccessSession(",
    "assertPendingBeforeRelease(verifierPromise",
    "VERIFY_BARRIER_RELEASED",
    "assert.rejects(verifierPromise",
    "guard.authorize(",
  ], "verify lock lane");
  const revokeStart = deno.indexOf("async function assertRevokeLockBarrier");
  const revokeLane = deno.slice(
    revokeStart,
    deno.indexOf("if (runtimeConfirmed)", revokeStart),
  );
  assert.match(
    revokeLane,
    /integration\.drs_server_sessions[\s\S]*for update/iu,
  );
  assert.doesNotMatch(revokeLane, /drs_auth_specialist_bindings/iu);
  assertOrdered(revokeLane, [
    "REVOKE_BARRIER_ROW_LOCKED",
    "sessionRevoker.revokeServerSession(",
    "assertPendingBeforeRelease(revokePromise",
    "REVOKE_BARRIER_RELEASED",
    "assert.rejects(revokePromise",
  ], "revoke lock lane");
  for (
    const call of [
      "assertIssueLockBarrier(",
      "assertVerifyLockBarrier(",
      "assertRevokeLockBarrier(",
    ]
  ) {
    assert.equal(
      occurrences(deno, new RegExp(call.replace("(", "\\("), "gu")) >= 2,
      true,
      call,
    );
  }
});

test("S2-R4 hostile fetch and tamper run through accepted runtime ports with output canary scans", () => {
  const ps = source(urls.powershell);
  const deno = source(urls.deno);
  const fixture = deno.slice(
    deno.indexOf("async function startHostileLoopbackFixture"),
    deno.indexOf("async function assertIssueLockBarrier"),
  );
  assert.match(fixture, /Deno\.serve\([\s\S]*hostname:\s*"127\.0\.0\.1"/u);
  assert.match(
    fixture,
    /createDrsSecureSessionRuntime\([\s\S]*fetch:\s*globalThis\.fetch/u,
  );
  assert.match(
    fixture,
    /hostileRuntime\.bootstrapDependencies\.accessSessionVerifier[\s\S]*verifyAccessSession/u,
  );
  assert.match(fixture, /hostileRuntime\.sessionRevoker\.revokeServerSession/u);
  assert.doesNotMatch(fixture, /readBoundedJson\(/u);
  for (
    const hostileCase of [
      "redirect",
      "canonical-content-length",
      "shorter-than-content-length",
      "longer-than-content-length",
      "empty",
      "fatal-utf8",
      "duplicate-top-level-member",
      "overflow-reader-cancellation",
      "provider-header-drop",
    ]
  ) {
    assert.match(
      deno,
      new RegExp(
        `await\\s+assertAcceptedRuntimeHostileCase\\(\\s*"${hostileCase}"`,
        "u",
      ),
    );
  }
  for (
    const tamperCase of [
      "cookie-bit-flip",
      "proof-bit-flip",
      "wrong-cookie-key",
      "wrong-proof-key",
      "malformed-cookie",
      "malformed-proof",
      "alg-none",
    ]
  ) {
    assert.match(
      deno,
      new RegExp(
        `await\\s+assertAcceptedRuntimeTamperCase\\(\\s*"${tamperCase}"`,
        "u",
      ),
    );
  }
  assert.match(
    ps,
    /function Assert-CapturedOutputSanitized[\s\S]*SUPABASE_SERVICE_ROLE_KEY[\s\S]*LAIBE_DRS_SESSION_COOKIE_KEY_V1[\s\S]*LAIBE_DRS_BFF_PROOF_KEY_V1/u,
  );
  assert.match(
    ps,
    /fixtureIds[\s\S]*authorityCanaries[\s\S]*A17_S1AR_CAPTURED_OUTPUT_SECRET_OR_CANARY/u,
  );
  assert.match(
    ps,
    /Assert-CapturedOutputSanitized[\s\S]*\$denoResult\.Stdout[\s\S]*\$denoResult\.Stderr/u,
  );
});

test("S3-F1 hostile fetch uses a valid digest input and proves one expected RPC path per case", () => {
  const ps = source(urls.powershell);
  const deno = source(urls.deno);
  const hostileToken = "A17_S1AR_HOSTILE_ACCESS_TOKEN_CANARY_202608";
  assert.equal(hostileToken.length, 43);
  assert.match(hostileToken, /^[A-Za-z0-9_-]{43}$/u);
  assert.match(
    deno,
    /const hostileAccessTokenCanary\s*=\s*"A17_S1AR_HOSTILE_ACCESS_TOKEN_CANARY_202608"/u,
  );
  assert.equal(
    occurrences(deno, /accessToken:\s*hostileAccessTokenCanary/gu) >= 2,
    true,
    "verifier and revoker use the exact valid canary",
  );
  const fixture = deno.slice(
    deno.indexOf("async function startHostileLoopbackFixture"),
    deno.indexOf("async function assertRotationBarrier"),
  );
  assert.match(fixture, /requestPaths[\s\S]*requestCount/u);
  assert.match(
    fixture,
    /assertExactRequests\([\s\S]*expectedPaths[\s\S]*requestCount[\s\S]*requestPaths/u,
  );
  assert.match(
    fixture,
    /fixture\.assertExactRequests\(expectedPaths\)/u,
  );
  assert.equal(
    ps.includes(hostileToken),
    true,
    "fixed canary is output-scanned",
  );
});

test("S3-F2 causal ROT or LOCK remains first when cleanup also fails", () => {
  const ps = source(urls.powershell);
  const deno = source(urls.deno);
  const terminal = deno.slice(
    deno.indexOf("if (cleanupErrors.length === 0)"),
    deno.indexOf("} else {", deno.indexOf("if (runtimeConfirmed)", 100)),
  );
  assert.match(terminal, /throw new AggregateError\(/u);
  assert.match(
    terminal,
    /primaryError\?\.causalMarker[\s\S]*const aggregate\s*=\s*\[[\s\S]*primaryTrace[\s\S]*\.\.\.cleanupErrors/u,
  );
  assertOrdered(
    terminal,
    [
      "primaryError?.causalMarker",
      "primaryTrace",
      "...cleanupErrors",
      "new AggregateError",
    ],
    "causal marker precedes cleanup failures",
  );
  const psTerminal = ps.slice(
    ps.indexOf("$trace ="),
    ps.indexOf("exit $terminalExitCode"),
  );
  assert.match(
    psTerminal,
    /if\s*\(\$cleanupErrors\.Count\s+-eq\s+0\)[\s\S]*else\s*\{[\s\S]*\$trace\.Add\(\$primaryResult\)[\s\S]*A17_S1AR_CLEANUP_FAILED/u,
  );
});

test("S3-F3 every lock lane proves a future DB deadline and releases only after DB expiry", () => {
  const deno = source(urls.deno);
  assert.match(
    deno,
    /function assertDbDeadlineFuture\([\s\S]*deadlineEpoch[\s\S]*dbNowEpoch[\s\S]*deadlineEpoch\s*>\s*dbNowEpoch/u,
  );
  for (
    const [laneName, nextLane, prefix, deadlineColumn, operation] of [
      [
        "assertIssueLockBarrier",
        "assertVerifyLockBarrier",
        "ISSUE",
        "valid_until =",
        "createVerifiedSession(",
      ],
      [
        "assertVerifyLockBarrier",
        "assertRevokeLockBarrier",
        "VERIFY",
        "valid_until =",
        ".verifyAccessSession(",
      ],
      [
        "assertRevokeLockBarrier",
        "if (runtimeConfirmed)",
        "REVOKE",
        "expires_at =",
        "sessionRevoker.revokeServerSession(",
      ],
    ]
  ) {
    const start = deno.indexOf(`async function ${laneName}`);
    const lane = deno.slice(start, deno.indexOf(nextLane, start));
    assertOrdered(
      lane,
      ["for update", deadlineColumn, `${prefix}_BARRIER_ROW_LOCKED`],
      `${prefix} lock-before-deadline composition`,
    );
    assertOrdered(
      lane,
      [
        `${prefix}_BARRIER_ROW_LOCKED`,
        "assertDbDeadlineFuture(barrier",
        operation,
        "assertPendingBeforeRelease(",
        `${prefix}_DB_DEADLINE_PASSED`,
        `${prefix}_BARRIER_RELEASED`,
      ],
      `${prefix} DB-clock lock lane`,
    );
    assert.match(lane, /clock_timestamp\(\)[\s\S]*pg_sleep/iu);
  }
});

test("S3-F4 cleanup readback proves every task-owned database fixture is absent", () => {
  const deno = source(urls.deno);
  const cleanup = deno.slice(
    deno.indexOf("function cleanupSql"),
    deno.indexOf("function sessionInput"),
  );
  for (
    const relation of [
      "integration.drs_server_sessions",
      "integration.drs_workspace_grants",
      "integration.drs_auth_specialist_bindings",
      "integration.drs_case_identity_bindings",
      "public.drs_case_specialist_assignment_terminations",
      "public.drs_case_specialist_assignments",
      "public.drs_cases",
      "public.drs_specialists",
      "casework.cases",
    ]
  ) {
    assert.equal(
      occurrences(
        cleanup,
        new RegExp(relation.replaceAll(".", "\\."), "giu"),
      ) >= 2,
      true,
      `${relation} delete plus zero-count readback`,
    );
  }
  assert.match(cleanup, /A17_CLEAN_READBACK_FAILED/u);
});

test("S3-F5 cookie revoke and proof-window lifecycle is exact and executable", () => {
  const deno = source(urls.deno);
  const createCookie = deno.slice(
    deno.indexOf("async function createCookie"),
    deno.indexOf("function bootstrapRequest"),
  );
  assert.match(
    createCookie,
    /response\.headers\.get\("location"\)[\s\S]*successUrl/u,
  );
  assert.match(
    createCookie,
    /response\.arrayBuffer\(\)[\s\S]*byteLength[\s\S]*0/u,
  );
  for (const attribute of ["Path=/", "HttpOnly", "Secure", "SameSite=Lax"]) {
    assert.equal(createCookie.includes(attribute), true, attribute);
  }
  assert.match(createCookie, /Domain[\s\S]*(?:false|null|-1)/u);

  const revoked = deno.slice(
    deno.indexOf("async function assertRevokedBootstrapAndGuard401"),
    deno.indexOf("async function assertProofReplayWithinWindow"),
  );
  assert.equal(
    occurrences(revoked, /runtime\.sessionRevoker\.revokeServerSession\(/gu),
    2,
    "revoker is called twice",
  );
  assert.match(
    revoked,
    /assert\.rejects\([\s\S]*sessionRevoker\.revokeServerSession/u,
  );

  const expiry = deno.slice(
    deno.indexOf("async function assertProofExpiryWithInjectedClock"),
    deno.indexOf("async function assertProofRejectedAfterRevokeAndRotation"),
  );
  assertOrdered(
    expiry,
    ["+ 59_000", "guard.authorize(", "+ 61_000", "assert.rejects"],
    "proof succeeds at 59 seconds and rejects at 61 seconds",
  );
});

test("S3-F6 RLS closure denies every table privilege to all admitted API roles", () => {
  const sql = source(urls.sql);
  const privilegeMatrix = sql.slice(
    sql.indexOf("A17_ACL_TABLE_LEAST_PRIVILEGE_FAILED") - 1800,
    sql.indexOf("A17_ACL_TABLE_LEAST_PRIVILEGE_FAILED") + 500,
  );
  assert.match(privilegeMatrix, /effective_privilege_matrix/iu);
  for (const role of ["anon", "authenticated", "service_role"]) {
    assert.match(privilegeMatrix, new RegExp(`\\('${role}'\\)`, "iu"));
  }
  for (const privilege of ["SELECT", "INSERT", "UPDATE", "DELETE"]) {
    assert.match(privilegeMatrix, new RegExp(`\\('${privilege}'\\)`, "u"));
  }
  assert.match(
    privilegeMatrix,
    /has_table_privilege\([\s\S]*role_name[\s\S]*integration\.drs_server_sessions[\s\S]*privilege_name/iu,
  );
  assert.match(
    sql,
    /relrowsecurity[\s\S]*relforcerowsecurity[\s\S]*pg_policies/iu,
  );
});

test("S4-F1 hostile projection expiry is fresh and bounded after each request arrives", () => {
  const deno = source(urls.deno);
  const fixture = deno.slice(
    deno.indexOf("async function startHostileLoopbackFixture"),
    deno.indexOf("async function assertRotationBarrier"),
  );
  const handlerStart = fixture.indexOf("}, (request) => {");
  assert.notEqual(handlerStart, -1, "hostile request handler exists");
  const beforeHandler = fixture.slice(0, handlerStart);
  assert.doesNotMatch(
    beforeHandler,
    /validProjection|expires_at|Date\.now\(\)\s*\+\s*120_000/u,
    "fixture startup must not freeze the hostile projection expiry",
  );

  const handler = fixture.slice(handlerStart);
  assertOrdered(
    handler,
    [
      "const url = new URL(request.url)",
      "requestCount += 1",
      "const validProjection = JSON.stringify({",
      "expires_at: new Date(Date.now() + 120_000).toISOString()",
      "const canonical = encoder.encode(validProjection)",
    ],
    "projection expiry is constructed from a bounded fresh clock after receipt",
  );
  assert.match(
    handler,
    /if \(activeCase === "duplicate-top-level-member"\)[\s\S]*validProjection\.slice\(1, -1\)/u,
    "duplicate-member response derives from the same per-request projection",
  );
});

test("S5-F1 every closed child process is deadline-bounded and disposed before sanitized failure", () => {
  const ps = source(urls.powershell);
  const closedProcess = ps.slice(
    ps.indexOf("function Invoke-ClosedProcess"),
    ps.indexOf("function ConvertTo-base64url43"),
  );
  assert.doesNotMatch(
    ps,
    /\.WaitForExit\(\s*(?:|-?1|0|\[System\.Threading\.Timeout\]::Infinite)\s*\)/u,
    "parameterless, zero, and infinite process waits are forbidden",
  );
  assert.match(
    closedProcess,
    /\[ValidateRange\(1,\s*\[int\]::MaxValue\)\]\[int\]\$ProcessTimeoutMilliseconds\s*=\s*900000/u,
  );
  assert.match(
    closedProcess,
    /\[ValidateRange\(1,\s*\[int\]::MaxValue\)\]\[int\]\$ProcessGraceMilliseconds\s*=\s*10000/u,
  );
  assert.match(
    closedProcess,
    /\$exited\s*=\s*\$process\.WaitForExit\(\$ProcessTimeoutMilliseconds\)/u,
  );
  const timeoutPath = closedProcess.slice(
    closedProcess.indexOf("if (-not $exited)"),
    closedProcess.indexOf("if ($exitCode -ne 0"),
  );
  assertOrdered(
    timeoutPath,
    [
      "if (-not $exited)",
      "$process.Kill($true)",
      "$process.WaitForExit($ProcessGraceMilliseconds)",
      "$ProcessGraceMilliseconds",
      "throw $FailureCode",
    ],
    "timeout kills the exact process tree and only then returns a sanitized failure",
  );
  assert.match(
    closedProcess,
    /\[System\.Threading\.Tasks\.Task\]::WaitAll\([\s\S]*\$stdoutTask[\s\S]*\$stderrTask[\s\S]*\$ProcessGraceMilliseconds\)/u,
    "stdout and stderr drain is bounded",
  );
  assert.doesNotMatch(closedProcess, /\.Wait\(\s*\)|WaitAll\([^,\n)]*\)/u);
  assertOrdered(
    closedProcess,
    [
      "Task]::WaitAll",
      "$stdoutTask.GetAwaiter().GetResult()",
      "$stderrTask.GetAwaiter().GetResult()",
    ],
    "GetResult is reached only after the bounded drain completes",
  );
  assert.match(
    closedProcess,
    /catch\s*\{[\s\S]*throw \$FailureCode[\s\S]*\}\s*finally\s*\{[\s\S]*\$process\.Dispose\(\)[\s\S]*\}/u,
    "Dispose runs even when timeout kill or drain fails",
  );
  assert.doesNotMatch(
    closedProcess,
    /Write-(?:Host|Output)|Console\.|Stdout\s*\+|Stderr\s*\+/iu,
    "timeout path must not project child output",
  );
  const stopCleanup = ps.slice(
    ps.indexOf("function Invoke-ExactProjectStopCleanup"),
    ps.indexOf("if ([Environment]::GetEnvironmentVariable"),
  );
  assert.match(
    stopCleanup,
    /Invoke-ClosedProcess[\s\S]*nodeExecutable[\s\S]*dockerLoopbackProxyPath[\s\S]*supabase-executable[\s\S]*stop/iu,
  );
  assert.doesNotMatch(stopCleanup, /Start-Process|&\s*\$SupabaseExecutable/u);
  assert.match(
    ps,
    /catch\s*\{[\s\S]*\$primaryError[\s\S]*\}\s*finally\s*\{[\s\S]*Invoke-ExactProjectStopCleanup/u,
    "sanitized child failure reaches the outer cleanup state machine",
  );
});

test("S6-F1 timeout requires positively confirmed process-tree termination", () => {
  const ps = source(urls.powershell);
  const closedProcess = ps.slice(
    ps.indexOf("function Invoke-ClosedProcess"),
    ps.indexOf("function ConvertTo-base64url43"),
  );
  const terminationStart = closedProcess.indexOf("$terminateProcessTree = {");
  assert.notEqual(
    terminationStart,
    -1,
    "a common positive termination branch is required",
  );
  const termination = closedProcess.slice(
    terminationStart,
    closedProcess.indexOf("$process.StartInfo = $startInfo", terminationStart),
  );
  assert.doesNotMatch(termination, /catch\s*\{\s*\}/u);
  assert.match(
    termination,
    /try\s*\{[\s\S]*\$Process\.Kill\(\$true\)[\s\S]*\}\s*catch\s*\{[\s\S]*\$Process\.HasExited[\s\S]*A17_S1AR_PROCESS_TERMINATION_UNCONFIRMED[\s\S]*\}/iu,
    "Kill(true) failure is benign only when HasExited proves the race",
  );
  assert.match(
    termination,
    /\$postKillExited\s*=\s*\$Process\.WaitForExit\(\$ProcessGraceMilliseconds\)/iu,
  );
  assert.match(
    termination,
    /\$terminationConfirmed\s*=\s*\$postKillExited\s*-and\s*\$Process\.HasExited/iu,
  );
  assert.match(
    termination,
    /if \(-not \$terminationConfirmed\)\s*\{[\s\S]*throw 'A17_S1AR_PROCESS_TERMINATION_UNCONFIRMED'/u,
  );

  assert.equal(
    occurrences(closedProcess, /& \$terminateProcessTree \$false/gu),
    3,
    "stdin write, stdin flush, and process exit timeouts share one termination path",
  );
  assert.match(
    closedProcess,
    /catch\s*\{[\s\S]*\$_\.Exception\.Message\s*-ceq\s*'A17_S1AR_PROCESS_TERMINATION_UNCONFIRMED'[\s\S]*\{\s*throw\s*\}[\s\S]*throw \$FailureCode[\s\S]*\}\s*finally\s*\{[\s\S]*\$process\.Dispose\(\)/u,
    "termination-unconfirmed survives wrapper normalization and Dispose remains unconditional",
  );
});

test("S6-F2 stdin write flush and exit consume one total finite process deadline", () => {
  const ps = source(urls.powershell);
  const closedProcess = ps.slice(
    ps.indexOf("function Invoke-ClosedProcess"),
    ps.indexOf("function ConvertTo-base64url43"),
  );
  assert.doesNotMatch(
    closedProcess,
    /\$process\.StandardInput\.(?:Write|WriteLine)\(/u,
    "synchronous stdin delivery can block before the deadline",
  );
  assertOrdered(
    closedProcess,
    [
      "$processDeadline = [System.Diagnostics.Stopwatch]::StartNew()",
      "$process.Start()",
      "$stdinWriteTask = $process.StandardInput.WriteAsync($StandardInput)",
      "$stdinWriteRemaining = Get-RemainingProcessDeadlineMilliseconds",
      "$stdinWriteTask.Wait($stdinWriteRemaining)",
      "& $terminateProcessTree $false",
      "$stdinWriteTask.GetAwaiter().GetResult()",
      "$stdinFlushTask = $process.StandardInput.FlushAsync()",
      "$stdinFlushRemaining = Get-RemainingProcessDeadlineMilliseconds",
      "$stdinFlushTask.Wait($stdinFlushRemaining)",
      "& $terminateProcessTree $false",
      "$stdinFlushTask.GetAwaiter().GetResult()",
      "$process.StandardInput.Close()",
      "$exitRemaining = Get-RemainingProcessDeadlineMilliseconds",
      "$ProcessTimeoutMilliseconds = $exitRemaining",
      "$process.WaitForExit($ProcessTimeoutMilliseconds)",
      "& $terminateProcessTree $false",
    ],
    "stdin and exit use remaining portions of the same total deadline",
  );
  assert.equal(
    occurrences(
      closedProcess,
      /Get-RemainingProcessDeadlineMilliseconds\s+-ProcessDeadline \$processDeadline\s+-ProcessTimeoutMilliseconds \$ProcessTimeoutMilliseconds/gu,
    ),
    3,
    "write, flush, and exit derive from the same exact 900000ms budget",
  );
  assert.doesNotMatch(closedProcess, /\.Wait\(\s*\)/u);
});

test("S7-F1 every post-start exception confirms child exit before normalization", () => {
  const ps = source(urls.powershell);
  const closedProcess = ps.slice(
    ps.indexOf("function Invoke-ClosedProcess"),
    ps.indexOf("function ConvertTo-base64url43"),
  );
  assertOrdered(
    closedProcess,
    [
      "$processStarted = $false",
      "$process.Start()",
      "$processStarted = $true",
      "$process.StandardOutput.ReadToEndAsync()",
    ],
    "start state becomes true only after Process.Start succeeds",
  );
  assert.equal(
    occurrences(closedProcess, /\$processStarted\s*=\s*\$true/gu),
    1,
  );

  const terminationStart = closedProcess.indexOf("$terminateProcessTree = {");
  const termination = closedProcess.slice(
    terminationStart,
    closedProcess.indexOf("$process.StartInfo = $startInfo", terminationStart),
  );
  assert.doesNotMatch(
    termination,
    /\$FailureCode|Task\]::WaitAll/u,
    "the common terminator must not hide generic normalization or output draining",
  );
  assertOrdered(
    termination,
    [
      "$alreadyExited = $process.HasExited",
      "if ($alreadyExited)",
      "return",
      "$process.Kill($true)",
      "$terminationConfirmed = $postKillExited -and $process.HasExited",
      "if (-not $terminationConfirmed)",
      "return",
    ],
    "the common branch positively returns only for already-exited or confirmed termination",
  );
  assert.equal(
    occurrences(
      closedProcess,
      /& \$terminateProcessTree \$false[\s\S]{0,500}Task\]::WaitAll[\s\S]{0,250}throw \$FailureCode/gu,
    ),
    3,
    "each explicit timeout terminates, bounded-drains, then throws caller failure",
  );

  const catchStart = closedProcess.lastIndexOf("\n  catch {");
  const outerCatch = closedProcess.slice(
    catchStart,
    closedProcess.indexOf("\n  finally {", catchStart),
  );
  assert.match(
    outerCatch,
    /if \(\$_\.Exception\.Message -ceq 'A17_S1AR_PROCESS_TERMINATION_UNCONFIRMED'\)\s*\{\s*throw\s*\}/u,
  );
  assertOrdered(
    outerCatch,
    [
      "A17_S1AR_PROCESS_TERMINATION_UNCONFIRMED",
      "if ($processStarted)",
      "$caughtProcessExited = $process.HasExited",
      "catch { throw 'A17_S1AR_PROCESS_TERMINATION_UNCONFIRMED' }",
      "if (-not $caughtProcessExited)",
      "& $terminateProcessTree -exited $false",
      "throw $FailureCode",
    ],
    "generic failure can normalize only after positive exit or termination",
  );
  assert.match(
    closedProcess,
    /finally\s*\{[\s\S]*\$process\.Dispose\(\)/u,
  );
});

test("S8-F1 Docker and exact four Supabase image identities are immutable source facts", () => {
  const ps = source(urls.powershell);
  assert.match(
    ps,
    /\$DockerExecutableSha256\s*=\s*'0f97bc1111f59d859766ba938691ee07ed4e58d5fdaeb6f4dfb10a5ef5394753'/u,
    "the admitted Docker executable digest must replace the stale digest",
  );
  assert.doesNotMatch(
    ps,
    /0f97bcf0cdb7fbe3acb217302177942848c86b47f26c22334018a89b0d0b04/u,
  );

  const recordsStart = ps.indexOf("function Get-ExactSupabaseImageRecords");
  assert.notEqual(recordsStart, -1, "exact image records function is required");
  const records = ps.slice(
    recordsStart,
    ps.indexOf("function Assert-NoOwnedDockerResources", recordsStart),
  );
  const expected = [
    {
      sourceLiteral: "supabase/postgres:17.6.1.143",
      ref: "public.ecr.aws/supabase/postgres:17.6.1.143",
      imageId:
        "sha256:80d7b27c3e8d77cfa7226eee9508671796da214781ff15a35b3670d7ad5ee453",
      repoDigest:
        "public.ecr.aws/supabase/postgres@sha256:80d7b27c3e8d77cfa7226eee9508671796da214781ff15a35b3670d7ad5ee453",
    },
    {
      sourceLiteral: "supabase/gotrue:v2.192.0",
      ref: "public.ecr.aws/supabase/gotrue:v2.192.0",
      imageId:
        "sha256:b252efb680be37d4a8bf77c210cf0439c19b63a4b51929233a65dd101d25bdab",
      repoDigest:
        "public.ecr.aws/supabase/gotrue@sha256:b252efb680be37d4a8bf77c210cf0439c19b63a4b51929233a65dd101d25bdab",
    },
    {
      sourceLiteral: "postgrest/postgrest:v14.14",
      ref: "public.ecr.aws/supabase/postgrest:v14.14",
      imageId:
        "sha256:d2009b5c9deffc210c8a5592698472fede14fd9f6ca89823c8474ca54d58c012",
      repoDigest:
        "public.ecr.aws/supabase/postgrest@sha256:d2009b5c9deffc210c8a5592698472fede14fd9f6ca89823c8474ca54d58c012",
    },
    {
      sourceLiteral: "library/kong:2.8.1",
      ref: "public.ecr.aws/supabase/kong:2.8.1",
      imageId:
        "sha256:1b53405d8680a09d6f44494b7990bf7da2ea43f84a258c59717d4539abf09f6d",
      repoDigest:
        "public.ecr.aws/supabase/kong@sha256:1b53405d8680a09d6f44494b7990bf7da2ea43f84a258c59717d4539abf09f6d",
    },
  ];
  for (const image of expected) {
    for (const value of Object.values(image)) {
      assert.equal(records.includes(`'${value}'`), true, value);
    }
  }
  for (const field of ["sourceLiteral", "ref", "imageId", "repoDigest"]) {
    assert.equal(
      occurrences(records, new RegExp(`${field}\\s*=`, "gu")),
      4,
      `${field} must have exactly four immutable mappings`,
    );
  }
  assertOrdered(
    records,
    [
      "[System.IO.File]::ReadAllBytes($SupabaseExecutable)",
      "$firstIndex = $ascii.IndexOf($record.sourceLiteral, [System.StringComparison]::Ordinal)",
      "$lastIndex = $ascii.LastIndexOf($record.sourceLiteral, [System.StringComparison]::Ordinal)",
      "$firstIndex -lt 0 -or $lastIndex -ne $firstIndex",
      "return $expectedImages",
    ],
    "each source literal is selected once by ordinal identity from the pinned CLI bytes",
  );
  assert.doesNotMatch(
    records,
    /\[regex\]|::Matches|Sort-Object|services|\$repositor(?:y|ies)|[A-Za-z0-9]\._-\]\{/iu,
    "repository-wide regex or service-driven version discovery is forbidden",
  );
});

test("S8-F2 local image cache verifies four exact singletons without discovery or mutation", () => {
  const ps = source(urls.powershell);
  const cacheStart = ps.indexOf("function Assert-LocalImageCache");
  assert.notEqual(cacheStart, -1, "local image cache assertion is required");
  const cache = ps.slice(
    cacheStart,
    ps.indexOf("function Read-StatusEnvironment", cacheStart),
  );
  assertOrdered(
    cache,
    [
      "$expectedImages = Get-ExactSupabaseImageRecords",
      "foreach ($record in $expectedImages)",
      "$result = Invoke-ClosedProcess",
      "@('image', 'inspect', '--format', '{{.Id}}|{{json .RepoTags}}|{{json .RepoDigests}}', $record.ref)",
      '$outputLine = $result.Stdout.TrimEnd("`r", "`n")',
      "$fields = @($outputLine -split '\\|', 4)",
      "$repoTags = @(ConvertFrom-Json -InputObject $fields[1])",
      "$repoDigests = @(ConvertFrom-Json -InputObject $fields[2])",
      "$repoTags.Count -ne 1 -or $repoTags[0] -cne $record.ref",
      "$repoDigests.Count -ne 1 -or $repoDigests[0] -cne $record.repoDigest",
    ],
    "the bounded inspect result is parsed and compared to all exact image facts",
  );
  assert.equal(
    occurrences(
      cache,
      /@\('image', 'inspect', '--format', '\{\{\.Id\}\}\|\{\{json \.RepoTags\}\}\|\{\{json \.RepoDigests\}\}', \$record\.ref\)/gu,
    ),
    1,
    "one inspect call inside the exact-four loop is required",
  );
  assert.equal(occurrences(cache, /Invoke-ClosedProcess/gu), 1);
  assert.match(
    cache,
    /-Environment\s+@\{\s*DOCKER_CLI_HINTS\s*=\s*'false'\s*\}/u,
    "image inspect inherits the bounded clear-environment wrapper",
  );
  assert.match(
    cache,
    /\$result\.Stdout\s+-notmatch\s+'[^']+'/u,
    "missing, duplicate, or multiline inspect output is rejected",
  );
  assert.match(
    cache,
    /\$fields\.Count\s+-ne\s+3[\s\S]*IsNullOrWhiteSpace\(\$fields\[0\]\)[\s\S]*IsNullOrWhiteSpace\(\$fields\[1\]\)[\s\S]*IsNullOrWhiteSpace\(\$fields\[2\]\)/u,
  );
  assert.match(
    cache,
    /\$fields\[1\]\.StartsWith\('\['\)[\s\S]*\$fields\[1\]\.EndsWith\('\]'\)[\s\S]*\$fields\[2\]\.StartsWith\('\['\)[\s\S]*\$fields\[2\]\.EndsWith\('\]'\)/u,
    "RepoTags and RepoDigests must be JSON arrays before closed parsing",
  );
  assert.match(cache, /\$fields\[0\]\s+-cne\s+\$record\.imageId/u);
  assert.doesNotMatch(cache, /Start-Process|&\s*\$DockerExecutable/u);
  assert.doesNotMatch(
    cache,
    /["'](?:services|list|images|pull|tag|load|build|remove|prune|login|logout|network)["']|\b(?:services|images|pull|load|build|prune|login|logout)\b/iu,
    "image preflight may inspect only the four immutable references",
  );
});

test("S9-F1 image inspect stdout uses absolute anchors before trim and split", () => {
  const ps = source(urls.powershell);
  const cacheStart = ps.indexOf("function Assert-LocalImageCache");
  const cache = ps.slice(
    cacheStart,
    ps.indexOf("function Read-StatusEnvironment", cacheStart),
  );
  const guards = [
    ...cache.matchAll(/\$result\.Stdout\s+-notmatch\s+'([^']+)'/gu),
  ];
  assert.equal(
    guards.length,
    1,
    "inspect stdout must have one closed shape guard",
  );
  assert.equal(
    guards[0][1],
    String.raw`\A[^\r\n]+(?:\r?\n)?\z`,
    "inspect stdout must consume the absolute start through absolute end",
  );
  assert.equal(
    guards[0][1].startsWith("^"),
    false,
    "line-oriented ^ start anchor is forbidden for inspect stdout",
  );
  assert.equal(
    guards[0][1].endsWith("$"),
    false,
    "line-oriented $ end anchor is forbidden for inspect stdout",
  );
  assertOrdered(
    cache,
    [
      "$result.Stdout -notmatch '\\A[^\\r\\n]+(?:\\r?\\n)?\\z'",
      '$outputLine = $result.Stdout.TrimEnd("`r", "`n")',
      "$fields = @($outputLine -split '\\|', 4)",
    ],
    "absolute raw stdout validation precedes trimming and field parsing",
  );
});

test("S10-F1 listener selector is bounded and mutation-sensitive", () => {
  const contract = readFileSync(new URL(import.meta.url), "utf8");
  const selectorStart = contract.indexOf(
    'test("S2-R1 protected identity is exact-twelve and listener queries fail closed"',
  );
  const selectorEnd = contract.indexOf(
    'test("S2-R2 causal terminal and cleanup preserve an exact ROT or LOCK reason"',
    selectorStart,
  );
  assert.notEqual(selectorStart, -1);
  assert.equal(selectorEnd > selectorStart, true);
  const selector = contract.slice(selectorStart, selectorEnd);
  assertOrdered(
    selector,
    [
      "const listenerStart = candidateSource.indexOf(",
      '"function Assert-NoOwnedListeners"',
      "const listenerEnd = candidateSource.indexOf(",
      '"function Get-ExactSupabaseImageRecords"',
      "listenerStart,",
      "assert.notEqual(listenerStart, -1",
      "assert.notEqual(listenerEnd, -1",
      "assert.equal(",
      "listenerEnd > listenerStart,",
      "const listenerFunction = candidateSource.slice(listenerStart, listenerEnd)",
      "const mutatedListenerSource = ps.replace(",
      '"Get-NetTCPConnection -State Listen -ErrorAction Stop"',
      "const laterListenerSource = mutatedListenerSource.slice(",
      "mutatedListenerSource.indexOf(",
      '"function Get-ExactSupabaseImageRecords"',
      "assert.match(",
      "laterListenerSource,",
      "/-ErrorAction\\s+Stop/u",
      "assert.throws(",
      "assertListenerQueryFailsClosed(mutatedListenerSource)",
    ],
    "S2-R1 must prove its exact bounds and detect removal of its own fail-closed flag",
  );
});

test("S11-F1 Git Tar and Deno identities are immutable and gated before use", () => {
  const ps = source(urls.powershell);
  const identities = [
    {
      label: "Git",
      path: "C:\\Program Files\\Git\\cmd\\git.exe",
      sha: "da240fe9bc24895b3e04150a4990b8a6ff329ecabcd8f19684c2cc310da5ef3f",
      scalar: "gitExecutable",
    },
    {
      label: "Tar",
      path: "C:\\WINDOWS\\system32\\tar.exe",
      sha: "9b77d4c912f2edae8c241d0ece1094d2ac068b084269ceaf85d7c7b085d2ae86",
      scalar: "tarExecutable",
    },
    {
      label: "Deno",
      path: "C:\\Users\\J\\AppData\\Local\\Microsoft\\WinGet\\Links\\deno.exe",
      sha: "3c53c061724194360f71b45e1dd227128750fe5c167ce314fa9c64110e690598",
      scalar: "denoExecutable",
    },
  ];
  for (const identity of identities) {
    assert.equal(
      ps.includes(`$${identity.label}ExecutablePath = '${identity.path}'`),
      true,
      `${identity.label} exact path`,
    );
    assert.equal(
      ps.includes(`$${identity.label}ExecutableSha256 = '${identity.sha}'`),
      true,
      `${identity.label} exact digest`,
    );
    assert.equal(
      occurrences(ps, new RegExp(`\\$${identity.scalar}\\s*=`, "gu")),
      1,
      `${identity.label} operational scalar is assigned exactly once`,
    );
  }
  assert.doesNotMatch(
    ps,
    /Get-Command\s+(?:git|tar|deno)\b|\$env:PATH\b|GetEnvironmentVariable\([^\n]*['"]PATH['"]|\bwhere(?:\.exe)?\s+(?:git|tar|deno)\b/iu,
    "PATH discovery and fallback are forbidden",
  );

  const preUseStart = ps.indexOf(
    "$scriptRoot = Split-Path -Parent $PSCommandPath",
  );
  const preUseEnd = ps.indexOf('Assert-SourceIdentity -Stage "pre-start"');
  assert.notEqual(preUseStart, -1);
  assert.equal(preUseEnd > preUseStart, true);
  const preUse = ps.slice(preUseStart, preUseEnd);
  for (const identity of identities) {
    assertOrdered(
      preUse,
      [
        `Test-Path -LiteralPath $${identity.label}ExecutablePath -PathType Leaf`,
        `(Get-LowerSha256 $${identity.label}ExecutablePath) -cne $${identity.label}ExecutableSha256`,
        `throw 'A17_S1AR_${identity.label.toUpperCase()}_IDENTITY_REJECTED'`,
        `$${identity.scalar} = $${identity.label}ExecutablePath`,
      ],
      `${identity.label} identity is proven before scalar assignment`,
    );
  }
  assertOrdered(
    ps,
    [
      "$gitExecutable = $GitExecutablePath",
      "$tarExecutable = $TarExecutablePath",
      "$denoExecutable = $DenoExecutablePath",
      'Assert-SourceIdentity -Stage "pre-start"',
    ],
    "all executable identities are gated before the first source identity call",
  );
});

test("S12-F1 every closed-process argument array is a legal named-parameter value", () => {
  const ps = source(urls.powershell);
  assert.equal(
    occurrences(ps, /-Arguments\s+\[string\[\]\]@/gu),
    0,
    "unparenthesized array casts must never consume the named parameter boundary",
  );

  const correctedSites = [
    'Invoke-GitIdentity -Arguments @("rev-parse", "HEAD")',
    'Invoke-GitIdentity -Arguments @("rev-parse", "HEAD^{tree}")',
    'Invoke-GitIdentity -Arguments @("symbolic-ref", "--short", "HEAD")',
    'Invoke-GitIdentity -Arguments @("rev-list", "--parents", "-n", "1", "HEAD")',
    'Invoke-GitIdentity -Arguments @("diff", "--cached", "--name-only")',
    'Invoke-GitIdentity -Arguments @("ls-files", "--others", "--exclude-standard")',
    "Invoke-ClosedProcess -FilePath $nodeExecutable -Arguments @($dockerLoopbackProxyPath, '--supabase-executable', $SupabaseExecutable, '--project-id', $ProjectId, '--', \"start\", \"--workdir\", $runtimeRoot, '--exclude', 'studio,imgproxy,mailpit,storage-api,realtime,edge-runtime,logflare,vector,supavisor,postgres-meta')",
  ];
  assert.equal(correctedSites.length, 7);
  for (const site of correctedSites) {
    assert.equal(
      occurrences(
        ps,
        new RegExp(site.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "gu"),
      ),
      1,
      `exact legal argument site: ${site}`,
    );
  }
});

test("S13-F1 runtime archive is an exact immutable Supabase-only pathspec", () => {
  const ps = source(urls.powershell);
  assert.equal(
    occurrences(ps, /\$ArchiveContract\s*=\s*'git archive HEAD -- supabase'/gu),
    1,
    "archive contract must name the exact Supabase-only pathspec",
  );
  assert.equal(
    occurrences(
      ps,
      /\$ArchiveContract\s*-ne\s*'git archive HEAD -- supabase'/gu,
    ),
    1,
    "archive drift guard must bind the same exact contract",
  );

  const archiveStart = ps.indexOf("$archivePath = Assert-ExactDescendant");
  const archiveEnd = ps.indexOf(
    "Remove-Item -LiteralPath $archivePath -Force",
    archiveStart,
  );
  assert.notEqual(archiveStart, -1, "archive block start");
  assert.equal(archiveEnd > archiveStart, true, "archive block bounds");
  const archiveBlock = ps.slice(archiveStart, archiveEnd);
  const exactGitArchive =
    "Invoke-ClosedProcess -FilePath $gitExecutable -Arguments @('archive', 'HEAD', '--format=tar', \"--output=$archivePath\", '--', 'supabase') -WorkingDirectory $worktreeRoot -FailureCode 'A17_S1AR_GIT_ARCHIVE_FAILED'";
  assert.equal(
    archiveBlock.split(exactGitArchive).length - 1,
    1,
    "Git archive must receive the exact six ordered arguments",
  );
  assert.equal(
    occurrences(
      archiveBlock,
      /Invoke-ClosedProcess\s+-FilePath\s+\$tarExecutable\s+-Arguments\s+@\('-xf',\s*\$archivePath,\s*'-C',\s*\$runtimeRoot\)/gu,
    ),
    1,
    "only the pinned exact tar extractor may consume the archive",
  );
  assert.doesNotMatch(
    archiveBlock,
    /['"][^'"]*[*?][^'"]*['"]|\$(?:archive)?pathspec\b|['"](?:docs?|src|ui|app|public)['"]|--(?:encoding|locale)\b|charset\b|\b(?:LC_ALL|LANG)\b|Expand-Archive|\b7z(?:\.exe)?\b|\bbsdtar\b|System\.IO\.Compression/iu,
    "archive construction rejects wildcard, caller scope, non-Supabase roots, locale overrides, and alternate extractors",
  );
  assertExactSupabaseArchiveBlock(ps);
});

test("S14-F1 archive validator rejects every additive scope and extractor mutation", () => {
  const ps = source(urls.powershell);
  const archiveStartMarker =
    "$archivePath = Assert-ExactDescendant -Root $runtimeRoot -Candidate (Join-Path $runtimeRoot '.git-archive-head.tar')";
  const mutations = [
    [
      "whole-tree producer",
      "[void](Invoke-ClosedProcess -FilePath $gitExecutable -Arguments @('archive', 'HEAD', '--format=tar', \"--output=$archivePath.whole\") -WorkingDirectory $worktreeRoot -FailureCode 'A17_S1AR_GIT_ARCHIVE_FAILED')",
    ],
    ["caller pathspec", "$archivePathspec = $ExpectedArchivePathspec"],
    ["docs root", "$archiveExtraRoot = 'docs'"],
    ["src root", "$archiveExtraRoot = 'src'"],
    ["UI root", "$archiveExtraRoot = 'UI'"],
    ["wildcard", "$archiveExtraRoot = 'supabase/*'"],
    ["locale override", "$archiveLocale = '--locale=C'"],
    [
      "alternate extractor",
      "Expand-Archive -LiteralPath $archivePath -DestinationPath $runtimeRoot",
    ],
  ];
  for (const [label, addition] of mutations) {
    const mutated = ps.replace(
      archiveStartMarker,
      archiveStartMarker + "\n  " + addition,
    );
    assert.throws(
      () => assertExactSupabaseArchiveBlock(mutated),
      assert.AssertionError,
      label,
    );
  }
});

test("S15-F1 archive validator rejects producers and extractors after removal", () => {
  const ps = source(urls.powershell);
  const archiveEndMarker = "Remove-Item -LiteralPath $archivePath -Force";
  const mutations = [
    [
      "direct whole-tree archive",
      "[void](Invoke-ClosedProcess -FilePath $gitExecutable -Arguments @('archive', 'HEAD', '--format=tar', \"--output=$archivePath.direct\") -WorkingDirectory $worktreeRoot -FailureCode 'A17_S1AR_GIT_ARCHIVE_FAILED')",
    ],
    [
      "direct caller pathspec",
      "[void](Invoke-ClosedProcess -FilePath $gitExecutable -Arguments @('archive', 'HEAD', '--format=tar', \"--output=$archivePath.direct-caller\", '--', $archivePathspec) -WorkingDirectory $worktreeRoot -FailureCode 'A17_S1AR_GIT_ARCHIVE_FAILED')",
    ],
    [
      "Invoke-GitIdentity whole-tree archive",
      "[void](Invoke-GitIdentity -Arguments @('archive', 'HEAD', '--format=tar', \"--output=$archivePath.wrapper\") -FailureCode 'A17_S1AR_GIT_ARCHIVE_FAILED')",
    ],
    [
      "Invoke-GitIdentity caller pathspec",
      "[void](Invoke-GitIdentity -Arguments @('archive', 'HEAD', '--format=tar', \"--output=$archivePath.wrapper-caller\", '--', $archivePathspec) -FailureCode 'A17_S1AR_GIT_ARCHIVE_FAILED')",
    ],
    [
      "second tar extractor",
      "[void](Invoke-ClosedProcess -FilePath $tarExecutable -Arguments @('-xf', $archivePath, '-C', $runtimeRoot) -WorkingDirectory $runtimeRoot -FailureCode 'A17_S1AR_ARCHIVE_EXTRACT_FAILED')",
    ],
  ];
  for (const [label, addition] of mutations) {
    const mutated = ps.replace(
      archiveEndMarker,
      archiveEndMarker + "\n  " + addition,
    );
    assert.throws(
      () => assertExactSupabaseArchiveBlock(mutated),
      assert.AssertionError,
      label,
    );
  }
  const decoyAddition = [
    "# " + mutations[0][1],
    "$archiveProducerExample = '" +
    mutations[0][1].replaceAll("'", "''") +
    "'",
    "'" + mutations[2][1].replaceAll("'", "''") + "'",
    "function Invoke-ArchiveDecoy {",
    "  " + mutations[2][1],
    "  " + mutations[4][1],
    "}",
  ].join("\n");
  const decoySource = ps.replace(
    archiveEndMarker,
    archiveEndMarker + "\n  " + decoyAddition,
  );
  assert.doesNotThrow(
    () => assertExactSupabaseArchiveBlock(decoySource),
    "definitions, assignments, comments, and strings are not executable producers",
  );
});

test("S16-F1 native AST contract closes reachable invocation grammar and exact dataflows", () => {
  const ps = source(urls.powershell);
  const archiveEndMarker = "Remove-Item -LiteralPath $archivePath -Force";
  const archiveProbe = [
    "function Invoke-ArchiveReachabilityProbe {",
    "  [void](Invoke-GitIdentity -Arguments @('archive', 'HEAD', '--format=tar', \"--output=$archivePath.probe\") -FailureCode 'A17_S1AR_GIT_ARCHIVE_FAILED')",
    "}",
  ].join("\n");
  const baseWithUnreachableProbe = ps.replace(
    archiveEndMarker,
    archiveEndMarker + "\n" + archiveProbe,
  );
  assert.notEqual(baseWithUnreachableProbe, ps, "unreachable probe inserted");
  assert.doesNotThrow(
    () => assertExactSupabaseArchiveBlock(baseWithUnreachableProbe),
    "an uninvoked function definition is not a reachable archive producer",
  );

  const replaceOnce = (input, needle, replacement, label) => {
    const mutated = input.replace(needle, replacement);
    assert.notEqual(mutated, input, `${label}: mutation applied`);
    return mutated;
  };
  const appendAfterRemoval = (input, addition, label) =>
    replaceOnce(
      input,
      archiveEndMarker,
      archiveEndMarker + "\n" + addition,
      label,
    );
  const mutations = [
    [
      "quoted subexpression reachability",
      appendAfterRemoval(
        baseWithUnreachableProbe,
        '"$(Invoke-ArchiveReachabilityProbe)"',
        "quoted subexpression reachability",
      ),
    ],
    [
      "direct function reachability",
      appendAfterRemoval(
        baseWithUnreachableProbe,
        "Invoke-ArchiveReachabilityProbe",
        "direct function reachability",
      ),
    ],
    [
      "ampersand function reachability",
      appendAfterRemoval(
        baseWithUnreachableProbe,
        "& Invoke-ArchiveReachabilityProbe",
        "ampersand function reachability",
      ),
    ],
    [
      "dot function reachability",
      appendAfterRemoval(
        baseWithUnreachableProbe,
        ". Invoke-ArchiveReachabilityProbe",
        "dot function reachability",
      ),
    ],
    [
      "fifth terminateProcessTree invocation",
      replaceOnce(
        ps,
        "& $terminateProcessTree $false",
        "& $terminateProcessTree $false\n        & $terminateProcessTree $false",
        "fifth terminateProcessTree invocation",
      ),
    ],
    [
      "unresolved dynamic command",
      appendAfterRemoval(ps, "& $unknownCommand", "unresolved dynamic command"),
    ],
    [
      "closed-process splat",
      appendAfterRemoval(
        ps,
        "Invoke-ClosedProcess @archiveInvocation",
        "closed-process splat",
      ),
    ],
    [
      "closed-process abbreviated parameters",
      appendAfterRemoval(
        ps,
        "Invoke-ClosedProcess -File $gitExecutable -Arg @('version') -Working $worktreeRoot -Failure 'A17_S1AR_GIT_ARCHIVE_FAILED'",
        "closed-process abbreviated parameters",
      ),
    ],
    [
      "process alias",
      appendAfterRemoval(
        ps,
        "icp -FilePath $gitExecutable -Arguments @('version')",
        "process alias",
      ),
    ],
    [
      "unknown static command",
      appendAfterRemoval(ps, "Invoke-UnknownProcess", "unknown static command"),
    ],
    [
      "duplicate closed-process call",
      appendAfterRemoval(
        ps,
        "[void](Invoke-ClosedProcess -FilePath $gitExecutable -Arguments @('version') -WorkingDirectory $worktreeRoot -FailureCode 'A17_S1AR_GIT_ARCHIVE_FAILED')",
        "duplicate closed-process call",
      ),
    ],
    [
      "additional ProcessStartInfo ArgumentList mutation",
      appendAfterRemoval(
        ps,
        "[void]$startInfo.ArgumentList.Add('--whole-tree')",
        "additional ProcessStartInfo ArgumentList mutation",
      ),
    ],
    [
      "static Process.Start producer",
      appendAfterRemoval(
        ps,
        "[void][System.Diagnostics.Process]::Start($gitExecutable, 'archive HEAD')",
        "static Process.Start producer",
      ),
    ],
    [
      "Git wrapper propagation drift",
      replaceOnce(
        ps,
        "-Arguments $Arguments `",
        "-Arguments $UnexpectedArguments `",
        "Git wrapper propagation drift",
      ),
    ],
    [
      "queries loop dataflow drift",
      replaceOnce(
        ps,
        "foreach ($query in $queries)",
        "foreach ($query in $unexpectedQueries)",
        "queries loop dataflow drift",
      ),
    ],
    [
      "image record ref dataflow drift",
      replaceOnce(
        ps,
        "$record.ref) `",
        "$record.sourceLiteral) `",
        "image record ref dataflow drift",
      ),
    ],
    [
      "Arguments variable rebinding",
      appendAfterRemoval(
        ps,
        "$Arguments = @('archive','HEAD')",
        "Arguments variable rebinding",
      ),
    ],
    [
      "Arguments index rebinding",
      appendAfterRemoval(
        ps,
        "$Arguments[0] = 'archive'",
        "Arguments index rebinding",
      ),
    ],
    [
      "Arguments member mutation",
      appendAfterRemoval(
        ps,
        "$Arguments.SetValue('archive', 0)",
        "Arguments member mutation",
      ),
    ],
    [
      "queries index rebinding",
      appendAfterRemoval(
        ps,
        "$queries[0] = @('images','ls')",
        "queries index rebinding",
      ),
    ],
    [
      "queries member mutation",
      appendAfterRemoval(
        ps,
        "$queries.SetValue(@('images','ls'), 0)",
        "queries member mutation",
      ),
    ],
    [
      "query index rebinding",
      appendAfterRemoval(ps, "$query[0] = 'images'", "query index rebinding"),
    ],
    [
      "record ref rebinding",
      appendAfterRemoval(
        ps,
        "$record.ref = 'attacker/image:latest'",
        "record ref rebinding",
      ),
    ],
  ];

  for (const [label, mutated] of mutations) {
    assert.throws(
      () => assertExactSupabaseArchiveBlock(mutated),
      assert.AssertionError,
      label,
    );
  }

  const caseInsensitiveCommandMutations = [
    [
      "lowercase Invoke-ClosedProcess direct archive producer",
      appendAfterRemoval(
        ps,
        "[void](invoke-closedprocess -FilePath $gitExecutable -Arguments @('archive', 'HEAD', '--format=tar', \"--output=$archivePath.lowercase\") -WorkingDirectory $worktreeRoot -FailureCode 'A17_S1AR_GIT_ARCHIVE_FAILED')",
        "lowercase Invoke-ClosedProcess direct archive producer",
      ),
    ],
    [
      "mixed-case Invoke-GitIdentity wrapper archive producer",
      appendAfterRemoval(
        ps,
        "[void](InVoKe-GiTiDeNtItY -Arguments @('archive', 'HEAD', '--format=tar', \"--output=$archivePath.mixedcase\") -FailureCode 'A17_S1AR_GIT_ARCHIVE_FAILED')",
        "mixed-case Invoke-GitIdentity wrapper archive producer",
      ),
    ],
  ];
  const missedCaseInsensitiveCommandMutations = [];
  for (const [label, mutated] of caseInsensitiveCommandMutations) {
    try {
      assertExactSupabaseArchiveBlock(mutated);
      missedCaseInsensitiveCommandMutations.push(label);
    } catch (error) {
      if (!(error instanceof assert.AssertionError)) throw error;
    }
  }
  assert.deepEqual(
    missedCaseInsensitiveCommandMutations,
    [],
    "native AST command classification must reject case-drifted archive producers",
  );

  const semanticMemberMutations = [
    [
      "case-insensitive static Process.start producer",
      appendAfterRemoval(
        ps,
        "[void][System.Diagnostics.Process]::start($gitExecutable, 'archive HEAD')",
        "case-insensitive static Process.start producer",
      ),
    ],
    [
      "case-insensitive ArgumentList.add mutation",
      appendAfterRemoval(
        ps,
        "[void]$startInfo.ArgumentList.add('--whole-tree')",
        "case-insensitive ArgumentList.add mutation",
      ),
    ],
    [
      "case-insensitive receiver ArgumentList.Add mutation",
      appendAfterRemoval(
        ps,
        "[void]$StartInfo.argumentlist.Add('--whole-tree')",
        "case-insensitive receiver ArgumentList.Add mutation",
      ),
    ],
    [
      "parenthesized ArgumentList.Add mutation",
      appendAfterRemoval(
        ps,
        "[void]($startInfo.ArgumentList).Add('--whole-tree')",
        "parenthesized ArgumentList.Add mutation",
      ),
    ],
    [
      "in-function ArgumentList alias mutation",
      replaceOnce(
        ps,
        "    [void]$startInfo.ArgumentList.Add($argument)",
        [
          "    $archiveArgumentList = $startInfo.ArgumentList",
          "    [void]$archiveArgumentList.Add('--whole-tree')",
          "    [void]$startInfo.ArgumentList.Add($argument)",
        ].join("\n"),
        "in-function ArgumentList alias mutation",
      ),
    ],
  ];
  const missedSemanticMutations = [];
  for (const [label, mutated] of semanticMemberMutations) {
    try {
      assertExactSupabaseArchiveBlock(mutated);
      missedSemanticMutations.push(label);
    } catch (error) {
      if (!(error instanceof assert.AssertionError)) throw error;
    }
  }
  assert.deepEqual(
    missedSemanticMutations,
    [],
    "native AST semantics must reject every Start/ArgumentList.Add bypass",
  );
});

test("S17-F1 every Supabase CLI child receives only telemetry suppression and exact SystemRoot", () => {
  const ps = source(urls.powershell);
  assertExactSupabaseCliEnvironment(ps);

  const mutateOnce = (input, needle, replacement, label) => {
    const mutated = input.replace(needle, replacement);
    assert.notEqual(mutated, input, `${label}: mutation applied`);
    return mutated;
  };
  const sharedSystemRootRemoved = mutateOnce(
    ps,
    "$supabaseProcessEnvironment = @{ DO_NOT_TRACK = '1'; SUPABASE_TELEMETRY_DISABLED = '1'; SystemRoot = $SystemRootPath }",
    "$supabaseProcessEnvironment = @{ DO_NOT_TRACK = '1'; SUPABASE_TELEMETRY_DISABLED = '1' }",
    "shared SystemRoot removal",
  );
  assert.throws(
    () => assertExactSupabaseCliEnvironment(sharedSystemRootRemoved),
    assert.AssertionError,
    "shared start/status environment rejects missing SystemRoot",
  );

  const wrapperExtraEnvironment = mutateOnce(
    ps,
    "  $startInfo.Environment.Clear()\n  foreach ($entry in $Environment.GetEnumerator()) {",
    "  $startInfo.Environment.Clear()\n  $startInfo.Environment['EXTRA'] = '1'\n  foreach ($entry in $Environment.GetEnumerator()) {",
    "WRAPPER_EXTRA_ENV",
  );

  const clearAfterCopy = mutateOnce(
    ps,
    "  $startInfo.Environment.Clear()\n  foreach ($entry in $Environment.GetEnumerator()) {\n    $startInfo.Environment[$entry.Key] = [string]$entry.Value\n  }",
    "  foreach ($entry in $Environment.GetEnumerator()) {\n    $startInfo.Environment[$entry.Key] = [string]$entry.Value\n  }\n  $startInfo.Environment.Clear()",
    "CLEAR_AFTER_COPY",
  );

  const callerEnvironmentExtraWrite = mutateOnce(
    ps,
    "  $startInfo.Environment.Clear()\n  foreach ($entry in $Environment.GetEnumerator()) {",
    "  $startInfo.Environment.Clear()\n  $Environment['EXTRA'] = '1'\n  foreach ($entry in $Environment.GetEnumerator()) {",
    "CALLER_ENV_EXTRA_WRITE",
  );

  const copyEntryRebind = mutateOnce(
    ps,
    "  foreach ($entry in $Environment.GetEnumerator()) {\n    $startInfo.Environment[$entry.Key] = [string]$entry.Value",
    "  foreach ($entry in $Environment.GetEnumerator()) {\n    $entry = [pscustomobject]@{ Key = 'EXTRA'; Value = '1' }\n    $startInfo.Environment[$entry.Key] = [string]$entry.Value",
    "COPY_ENTRY_REBIND",
  );

  const environmentPipelineAliasWrite = mutateOnce(
    ps,
    "  $startInfo.Environment.Clear()\n  foreach ($entry in $Environment.GetEnumerator()) {",
    "  $startInfo.Environment.Clear()\n  $Environment | ForEach-Object { $_['EXTRA'] = '1' }\n  foreach ($entry in $Environment.GetEnumerator()) {",
    "ENV_PIPELINE_ALIAS_WRITE",
  );

  const psBoundParametersAliasWrite = mutateOnce(
    ps,
    "  $startInfo.Environment.Clear()\n  foreach ($entry in $Environment.GetEnumerator()) {",
    "  $startInfo.Environment.Clear()\n  $environmentAlias = $PSBoundParameters['Environment']\n  $environmentAlias['EXTRA'] = '1'\n  foreach ($entry in $Environment.GetEnumerator()) {",
    "PSBOUNDPARAMETERS_ALIAS_WRITE",
  );

  const myInvocationAliasWrite = mutateOnce(
    ps,
    "  $startInfo.Environment.Clear()\n  foreach ($entry in $Environment.GetEnumerator()) {",
    "  $startInfo.Environment.Clear()\n  $environmentAlias = $MyInvocation.BoundParameters['Environment']\n  $environmentAlias['EXTRA'] = '1'\n  foreach ($entry in $Environment.GetEnumerator()) {",
    "MYINVOCATION_ALIAS_WRITE",
  );

  const nestedFunctionPipelineAliasWrite = mutateOnce(
    ps,
    "  $startInfo.Environment.Clear()\n  foreach ($entry in $Environment.GetEnumerator()) {",
    "  $startInfo.Environment.Clear()\n  function Add-EnvironmentAlias {\n    $Environment | ForEach-Object { $_['EXTRA'] = '1' }\n  }\n  Add-EnvironmentAlias\n  foreach ($entry in $Environment.GetEnumerator()) {",
    "NESTED_FUNCTION_PIPELINE_ALIAS_WRITE",
  );

  const executionContextAliasWrite = mutateOnce(
    ps,
    "  $startInfo.Environment.Clear()\n  foreach ($entry in $Environment.GetEnumerator()) {",
    "  $startInfo.Environment.Clear()\n  $ExecutionContext.SessionState.PSVariable.GetValue('Environment')['EXTRA']='1'\n  foreach ($entry in $Environment.GetEnumerator()) {",
    "EXECUTIONCONTEXT_ALIAS_WRITE",
  );

  const cleanupSystemRootRenamed = mutateOnce(
    ps,
    "-Environment @{ DO_NOT_TRACK = '1'; SUPABASE_TELEMETRY_DISABLED = '1'; SystemRoot = $SystemRootPath } -AllowFailure",
    "-Environment @{ DO_NOT_TRACK = '1'; SUPABASE_TELEMETRY_DISABLED = '1'; SYSTEM_ROOT = $SystemRootPath } -AllowFailure",
    "cleanup SystemRoot rename",
  );
  assert.throws(
    () => assertExactSupabaseCliEnvironment(cleanupSystemRootRenamed),
    assert.AssertionError,
    "exact stop cleanup rejects renamed SystemRoot",
  );

  const cleanupSystemRootRemoved = mutateOnce(
    ps,
    "-Environment @{ DO_NOT_TRACK = '1'; SUPABASE_TELEMETRY_DISABLED = '1'; SystemRoot = $SystemRootPath } -AllowFailure",
    "-Environment @{ DO_NOT_TRACK = '1'; SUPABASE_TELEMETRY_DISABLED = '1' } -AllowFailure",
    "cleanup SystemRoot removal",
  );
  assert.throws(
    () => assertExactSupabaseCliEnvironment(cleanupSystemRootRemoved),
    assert.AssertionError,
    "exact stop cleanup rejects missing SystemRoot",
  );

  const cleanupParameterShadow = mutateOnce(
    ps,
    "function Invoke-ExactProjectStopCleanup {\n  $stopResult =",
    "function Invoke-ExactProjectStopCleanup {\n  param([string]$SystemRootPath = 'C:\\WINDOWS')\n\n  $stopResult =",
    "cleanup SystemRootPath parameter shadow",
  );

  const missedEnvironmentClosureMutations = [];
  for (
    const [label, mutated] of [
      ["WRAPPER_EXTRA_ENV", wrapperExtraEnvironment],
      ["CLEAR_AFTER_COPY", clearAfterCopy],
      ["CALLER_ENV_EXTRA_WRITE", callerEnvironmentExtraWrite],
      ["COPY_ENTRY_REBIND", copyEntryRebind],
      ["ENV_PIPELINE_ALIAS_WRITE", environmentPipelineAliasWrite],
      ["PSBOUNDPARAMETERS_ALIAS_WRITE", psBoundParametersAliasWrite],
      ["MYINVOCATION_ALIAS_WRITE", myInvocationAliasWrite],
      [
        "NESTED_FUNCTION_PIPELINE_ALIAS_WRITE",
        nestedFunctionPipelineAliasWrite,
      ],
      ["EXECUTIONCONTEXT_ALIAS_WRITE", executionContextAliasWrite],
      ["CLEANUP_PARAM_SHADOW", cleanupParameterShadow],
    ]
  ) {
    try {
      assertExactSupabaseCliEnvironment(mutated);
      missedEnvironmentClosureMutations.push(label);
    } catch (error) {
      if (!(error instanceof assert.AssertionError)) throw error;
    }
  }
  const missedPriorEnvironmentClosureMutations = [];
  for (
    const [label, mutated] of [
      ["ENV_PIPELINE_ALIAS_WRITE", environmentPipelineAliasWrite],
      ["PSBOUNDPARAMETERS_ALIAS_WRITE", psBoundParametersAliasWrite],
      ["MYINVOCATION_ALIAS_WRITE", myInvocationAliasWrite],
      [
        "NESTED_FUNCTION_PIPELINE_ALIAS_WRITE",
        nestedFunctionPipelineAliasWrite,
      ],
      ["EXECUTIONCONTEXT_ALIAS_WRITE", executionContextAliasWrite],
    ]
  ) {
    try {
      assertExactSupabaseArchiveBlock(mutated);
      missedPriorEnvironmentClosureMutations.push(label);
    } catch (error) {
      if (!(error instanceof assert.AssertionError)) throw error;
    }
  }
  assert.deepEqual(
    {
      exactEnvironmentGate: missedEnvironmentClosureMutations,
      priorGate: missedPriorEnvironmentClosureMutations,
    },
    { exactEnvironmentGate: [], priorGate: [] },
    "exact environment and prior native AST gates reject every wrapper environment mutation and cleanup shadow",
  );
});

test("S17-F2 Supabase start preserves exact exclusions containers and db-only volume", () => {
  const ps = source(urls.powershell);
  assertExactSupabaseStartExclusions(ps);
  const admittedExclusions =
    "studio,imgproxy,mailpit,storage-api,realtime,edge-runtime,logflare,vector,supavisor,postgres-meta";
  const mutated = ps.replace(
    admittedExclusions,
    admittedExclusions.replace("mailpit", "inbucket"),
  );
  assert.notEqual(mutated, ps, "inbucket exclusion mutation applied");
  assert.throws(
    () => assertExactSupabaseStartExclusions(mutated),
    assert.AssertionError,
    "inbucket cannot replace the hash-bound CLI mailpit exclusion",
  );

  const exactVolumeExpectation =
    '$expectedVolumes = @("supabase_db_$ProjectId") | Sort-Object';
  const missedVolumeMutations = [];
  for (
    const [label, replacement] of [
      [
        "EXTRA_CONFIG_VOLUME",
        '$expectedVolumes = @("supabase_config_$ProjectId", "supabase_db_$ProjectId") | Sort-Object',
      ],
      [
        "MISSING_DB_VOLUME",
        "$expectedVolumes = @() | Sort-Object",
      ],
      [
        "CASE_EQUIVALENT_REBIND",
        `${exactVolumeExpectation}\n$EXPECTEDVOLUMES = @("supabase_config_$ProjectId", "supabase_db_$ProjectId") | Sort-Object`,
      ],
      [
        "LOCAL_QUALIFIED_REBIND",
        `${exactVolumeExpectation}\n$local:expectedVolumes = @("supabase_config_$ProjectId", "supabase_db_$ProjectId") | Sort-Object`,
      ],
      [
        "EXPECTED_VOLUMES_INDEX_WRITE",
        `${exactVolumeExpectation}\n$expectedVolumes[0] = "supabase_config_$ProjectId"`,
      ],
      [
        "EXPECTED_VOLUMES_ALIAS_INDEX_WRITE",
        `${exactVolumeExpectation}\n$volumeAlias = $expectedVolumes\n$volumeAlias[0] = "supabase_config_$ProjectId"`,
      ],
      [
        "EXPECTED_VOLUMES_SETVALUE_WRITE",
        `${exactVolumeExpectation}\n$expectedVolumes.SetValue("supabase_config_$ProjectId", 0)`,
      ],
    ]
  ) {
    const volumeMutation = ps.replace(exactVolumeExpectation, replacement);
    assert.notEqual(volumeMutation, ps, `${label}: mutation applied`);
    try {
      assertExactSupabaseStartExclusions(volumeMutation);
      missedVolumeMutations.push(label);
    } catch (error) {
      if (!(error instanceof assert.AssertionError)) throw error;
    }
  }
  assert.deepEqual(
    missedVolumeMutations,
    [],
    "exact owned-volume set rejects rebinds aliases index writes and member mutation",
  );

  const pipelineInputObjectAliasWrite = ps.replace(
    exactVolumeExpectation,
    `${exactVolumeExpectation}\nForEach-Object -InputObject $expectedVolumes -Process { $_.SetValue("supabase_config_$ProjectId", 0) }`,
  );
  assert.notEqual(
    pipelineInputObjectAliasWrite,
    ps,
    "PIPELINE_INPUTOBJECT_ALIAS_WRITE: mutation applied",
  );
  const missedPipelineInputObjectGates = [];
  for (
    const [label, gate] of [
      ["canonicalResourceSelector", assertExactSupabaseStartExclusions],
      ["priorNativeGate", assertExactSupabaseArchiveBlock],
    ]
  ) {
    try {
      gate(pipelineInputObjectAliasWrite);
      missedPipelineInputObjectGates.push(label);
    } catch (error) {
      if (!(error instanceof assert.AssertionError)) throw error;
    }
  }
  assert.deepEqual(
    missedPipelineInputObjectGates,
    [],
    "PIPELINE_INPUTOBJECT_ALIAS_WRITE is rejected by both canonical resource gates",
  );
});

const loopbackProxyProjectId = "a17-s1ar-20260827";
const loopbackProxyContainerNames = Object.freeze([
  `supabase_auth_${loopbackProxyProjectId}`,
  `supabase_db_${loopbackProxyProjectId}`,
  `supabase_kong_${loopbackProxyProjectId}`,
  `supabase_rest_${loopbackProxyProjectId}`,
]);
const canonicalCreateTarget =
  `/v1.51/containers/create?name=supabase_db_${loopbackProxyProjectId}`;
const canonicalProjectHelperCreateTarget = "/v1.51/containers/create";

function dockerCreateBody(hostIp = "") {
  return Buffer.from(
    JSON.stringify({
      Image: "immutable-local-image",
      HostConfig: {
        PortBindings: {
          "5432/tcp": [{ HostIp: hostIp, HostPort: "54322" }],
        },
      },
    }),
    "utf8",
  );
}

const projectHelperEnvironmentNames = Object.freeze([
  "API_JWT_JWKS",
  "API_JWT_SECRET",
  "APP_NAME",
  "DB_AFTER_CONNECT_QUERY",
  "DB_ENC_KEY",
  "DB_HOST",
  "DB_NAME",
  "DB_PASSWORD",
  "DB_PORT",
  "DB_USER",
  "DNS_NODES",
  "ERL_AFLAGS",
  "MAX_HEADER_LENGTH",
  "METRICS_JWT_SECRET",
  "PORT",
  "RLIMIT_NOFILE",
  "RUN_JANITOR",
  "SECRET_KEY_BASE",
  "SEED_SELF_HOST",
]);

function projectHelperCreateValue() {
  return {
    Hostname: "",
    Domainname: "",
    User: "",
    AttachStdin: false,
    AttachStdout: false,
    AttachStderr: false,
    Tty: false,
    OpenStdin: false,
    StdinOnce: false,
    Env: projectHelperEnvironmentNames.map((name) => `${name}=opaque`),
    Cmd: [
      "/app/bin/realtime",
      "eval",
      '{:ok, _} = Application.ensure_all_started(:realtime)\n{:ok, _} = Realtime.Tenants.health_check("realtime-dev")',
    ],
    Image: "public.ecr.aws/supabase/realtime:v2.112.6",
    Volumes: null,
    WorkingDir: "",
    Entrypoint: null,
    OnBuild: null,
    Labels: {
      "com.docker.compose.project": loopbackProxyProjectId,
      "com.supabase.cli.project": loopbackProxyProjectId,
    },
    HostConfig: {
      Binds: null,
      ContainerIDFile: "",
      LogConfig: { Type: "", Config: null },
      NetworkMode: `supabase_network_${loopbackProxyProjectId}`,
      PortBindings: null,
      RestartPolicy: { Name: "", MaximumRetryCount: 0 },
      AutoRemove: false,
      VolumeDriver: "",
      VolumesFrom: null,
      ConsoleSize: [0, 0],
      CapAdd: null,
      CapDrop: null,
      CgroupnsMode: "",
      Dns: null,
      DnsOptions: null,
      DnsSearch: null,
      ExtraHosts: null,
      GroupAdd: null,
      IpcMode: "",
      Cgroup: "",
      Links: null,
      OomScoreAdj: 0,
      PidMode: "",
      Privileged: false,
      PublishAllPorts: false,
      ReadonlyRootfs: false,
      SecurityOpt: null,
      UTSMode: "",
      UsernsMode: "",
      ShmSize: 0,
      Isolation: "",
      CpuShares: 0,
      Memory: 0,
      NanoCpus: 0,
      CgroupParent: "",
      BlkioWeight: 0,
      BlkioWeightDevice: null,
      BlkioDeviceReadBps: null,
      BlkioDeviceWriteBps: null,
      BlkioDeviceReadIOps: null,
      BlkioDeviceWriteIOps: null,
      CpuPeriod: 0,
      CpuQuota: 0,
      CpuRealtimePeriod: 0,
      CpuRealtimeRuntime: 0,
      CpusetCpus: "",
      CpusetMems: "",
      Devices: null,
      DeviceCgroupRules: null,
      DeviceRequests: null,
      MemoryReservation: 0,
      MemorySwap: 0,
      MemorySwappiness: null,
      OomKillDisable: null,
      PidsLimit: null,
      Ulimits: null,
      CpuCount: 0,
      CpuPercent: 0,
      IOMaximumIOps: 0,
      IOMaximumBandwidth: 0,
      MaskedPaths: null,
      ReadonlyPaths: null,
    },
    NetworkingConfig: { EndpointsConfig: null },
  };
}

function projectHelperCreateBody() {
  return Buffer.from(JSON.stringify(projectHelperCreateValue()), "utf8");
}

function exactJsonRawHeaders(body) {
  return [
    "Content-Type",
    "application/json",
    "Content-Length",
    String(body.byteLength),
  ];
}

function uniquePipePath(label) {
  return `\\\\.\\pipe\\a17-s1ar-${label}-${randomBytes(16).toString("hex")}`;
}

async function closeServer(server) {
  if (!server.listening) return;
  server.close();
  await once(server, "close");
}

function requestOverPipe({ pipePath, method, target, body, rawHeaders }) {
  return new Promise((resolve, reject) => {
    const headers = {};
    for (let index = 0; index < rawHeaders.length; index += 2) {
      const name = rawHeaders[index];
      const value = rawHeaders[index + 1];
      if (Object.hasOwn(headers, name)) {
        headers[name] = Array.isArray(headers[name])
          ? [...headers[name], value]
          : [headers[name], value];
      } else {
        headers[name] = value;
      }
    }
    const request = httpRequest(
      { socketPath: pipePath, method, path: target, headers },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () =>
          resolve({
            statusCode: response.statusCode,
            body: Buffer.concat(chunks).toString("utf8"),
          }));
      },
    );
    request.once("error", reject);
    request.end(body);
  });
}

function upgradeOverPipe({ pipePath, method, target, body }) {
  return new Promise((resolve, reject) => {
    const socket = connectPipe(pipePath);
    const chunks = [];
    const timer = setTimeout(() => {
      socket.destroy();
      resolve(Buffer.concat(chunks).toString("utf8"));
    }, 100);
    socket.once("connect", () => {
      socket.write(
        `${method} ${target} HTTP/1.1\r\n` +
          "Host: docker\r\n" +
          "Connection: Upgrade\r\n" +
          "Upgrade: tcp\r\n" +
          "Content-Type: application/json\r\n" +
          `Content-Length: ${body.byteLength}\r\n\r\n`,
      );
      socket.write(body);
    });
    socket.on("data", (chunk) => chunks.push(chunk));
    socket.once("close", () => {
      clearTimeout(timer);
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
    socket.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

function fakeChildProcess({ stdout = "", stderr = "", exitCode = 0 }) {
  const child = new EventEmitter();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.kill = () => true;
  queueMicrotask(() => {
    child.stdout.end(stdout);
    child.stderr.end(stderr);
    child.emit("close", exitCode, null);
  });
  return child;
}

test("S18-F1 Docker create routing is canonical and every alias fails before backend", () => {
  assert.deepEqual(
    classifyDockerRequestTarget({
      method: "POST",
      target: canonicalCreateTarget,
      allowedContainerNames: loopbackProxyContainerNames,
    }),
    {
      kind: "container-create",
      containerName: `supabase_db_${loopbackProxyProjectId}`,
    },
  );

  assert.deepEqual(
    classifyDockerRequestTarget({
      method: "GET",
      target: "/v1.51/containers/json?all=1",
      allowedContainerNames: loopbackProxyContainerNames,
    }),
    { kind: "passthrough" },
  );

  for (
    const target of [
      `/containers/create?name=supabase_db_${loopbackProxyProjectId}`,
      `http://docker/v1.51/containers/create?name=supabase_db_${loopbackProxyProjectId}`,
      `/v1.51/CONTAINERS/create?name=supabase_db_${loopbackProxyProjectId}`,
      `/v1.51/containers/%63reate?name=supabase_db_${loopbackProxyProjectId}`,
      `/v1.51/containers%2fcreate?name=supabase_db_${loopbackProxyProjectId}`,
      `/v1.51/ignored/../containers/create?name=supabase_db_${loopbackProxyProjectId}`,
      `/v1.51//containers/create?name=supabase_db_${loopbackProxyProjectId}`,
      `/v1.51\\containers\\create?name=supabase_db_${loopbackProxyProjectId}`,
      `/v01.51/containers/create?name=supabase_db_${loopbackProxyProjectId}`,
      `/v1.051/containers/create?name=supabase_db_${loopbackProxyProjectId}`,
      `/v1.51/containers/create?name=supabase_db_${loopbackProxyProjectId}&name=supabase_db_${loopbackProxyProjectId}`,
      `/v1.51/containers/create?name=supabase_db_${loopbackProxyProjectId}&extra=1`,
      `/v1.51/containers/create?name=supabase%5fdb_${loopbackProxyProjectId}`,
      `/v1.51/containers/create?name=supabase_unknown_${loopbackProxyProjectId}`,
    ]
  ) {
    assert.throws(
      () =>
        classifyDockerRequestTarget({
          method: "POST",
          target,
          allowedContainerNames: loopbackProxyContainerNames,
        }),
      { message: "A17_DOCKER_LOOPBACK_PROXY_REQUEST_TARGET_REJECTED" },
      target,
    );
  }
});

test("S18-F2 Docker create JSON and framing are rewritten closed to IPv4 loopback", () => {
  for (const hostIp of ["", "127.0.0.1"]) {
    const body = dockerCreateBody(hostIp);
    const rewritten = rewriteContainerCreateRequest({
      rawHeaders: exactJsonRawHeaders(body),
      body,
    });
    assert.equal(rewritten.headers["content-type"], "application/json");
    assert.equal(
      rewritten.headers["content-length"],
      String(rewritten.body.byteLength),
    );
    assert.equal(rewritten.headers["transfer-encoding"], undefined);
    assert.equal(
      JSON.parse(rewritten.body.toString("utf8")).HostConfig.PortBindings[
        "5432/tcp"
      ][0].HostIp,
      "127.0.0.1",
    );
  }

  for (const hostIp of ["0.0.0.0", "::", "::1", "localhost", "127.0.0.01"]) {
    const body = dockerCreateBody(hostIp);
    assert.throws(
      () =>
        rewriteContainerCreateRequest({
          rawHeaders: exactJsonRawHeaders(body),
          body,
        }),
      { message: "A17_DOCKER_LOOPBACK_PROXY_CREATE_BODY_REJECTED" },
      hostIp,
    );
  }

  const validBody = dockerCreateBody();
  const noPublishedPorts = JSON.parse(validBody.toString("utf8"));
  delete noPublishedPorts.HostConfig.PortBindings;
  const noPublishedPortsBody = Buffer.from(JSON.stringify(noPublishedPorts));
  const noPublishedPortsResult = rewriteContainerCreateRequest({
    rawHeaders: exactJsonRawHeaders(noPublishedPortsBody),
    body: noPublishedPortsBody,
  });
  assert.equal(
    Object.hasOwn(
      JSON.parse(noPublishedPortsResult.body.toString("utf8")).HostConfig,
      "PortBindings",
    ),
    false,
    "a container with no published ports remains non-published",
  );

  for (const malformedBindings of [null, [], ""]) {
    const malformed = JSON.parse(validBody.toString("utf8"));
    malformed.HostConfig.PortBindings = malformedBindings;
    const malformedBody = Buffer.from(JSON.stringify(malformed));
    assert.throws(
      () =>
        rewriteContainerCreateRequest({
          rawHeaders: exactJsonRawHeaders(malformedBody),
          body: malformedBody,
        }),
      { message: "A17_DOCKER_LOOPBACK_PROXY_CREATE_BODY_REJECTED" },
    );
  }

  for (
    const rawHeaders of [
      ["Content-Length", String(validBody.byteLength)],
      [
        "Content-Type",
        "application/json; charset=utf-8",
        "Content-Length",
        String(validBody.byteLength),
      ],
      [
        ...exactJsonRawHeaders(validBody),
        "Content-Length",
        String(validBody.byteLength),
      ],
      [...exactJsonRawHeaders(validBody), "Transfer-Encoding", "chunked"],
      [...exactJsonRawHeaders(validBody), "Content-Encoding", "gzip"],
      [...exactJsonRawHeaders(validBody), "Expect", "100-continue"],
    ]
  ) {
    assert.throws(
      () => rewriteContainerCreateRequest({ rawHeaders, body: validBody }),
      { message: "A17_DOCKER_LOOPBACK_PROXY_CREATE_FRAMING_REJECTED" },
    );
  }

  const oversized = Buffer.alloc(1_048_577, 0x20);
  assert.throws(
    () =>
      rewriteContainerCreateRequest({
        rawHeaders: exactJsonRawHeaders(oversized),
        body: oversized,
      }),
    { message: "A17_DOCKER_LOOPBACK_PROXY_CREATE_FRAMING_REJECTED" },
  );

  const extraBinding = JSON.parse(validBody.toString("utf8"));
  extraBinding.HostConfig.PortBindings["5432/tcp"][0].Unknown = "value";
  const extraBindingBody = Buffer.from(JSON.stringify(extraBinding));
  assert.throws(
    () =>
      rewriteContainerCreateRequest({
        rawHeaders: exactJsonRawHeaders(extraBindingBody),
        body: extraBindingBody,
      }),
    { message: "A17_DOCKER_LOOPBACK_PROXY_CREATE_BODY_REJECTED" },
  );
});

test("S18-F3 named-pipe proxy rewrites canonical create and blocks aliases without backend", async () => {
  const backendPipe = uniquePipePath("backend");
  const frontendPipe = uniquePipePath("frontend");
  let backendRequests = 0;
  let backendBody = null;
  const backend = createHttpServer((request, response) => {
    backendRequests += 1;
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => {
      backendBody = Buffer.concat(chunks);
      response.writeHead(201, { "content-type": "application/json" });
      response.end('{"Id":"local-only"}');
    });
  });
  backend.listen(backendPipe);
  await once(backend, "listening");

  const proxy = await createDockerLoopbackProxyServer({
    pipePath: frontendPipe,
    backendPipe,
    allowedContainerNames: loopbackProxyContainerNames,
  });
  try {
    const body = dockerCreateBody();
    const accepted = await requestOverPipe({
      pipePath: frontendPipe,
      method: "POST",
      target: canonicalCreateTarget,
      body,
      rawHeaders: exactJsonRawHeaders(body),
    });
    assert.equal(accepted.statusCode, 201);
    assert.equal(backendRequests, 1);
    assert.equal(
      JSON.parse(backendBody.toString("utf8")).HostConfig.PortBindings[
        "5432/tcp"
      ][0].HostIp,
      "127.0.0.1",
    );

    const rejected = await requestOverPipe({
      pipePath: frontendPipe,
      method: "POST",
      target: `/containers/create?name=supabase_db_${loopbackProxyProjectId}`,
      body,
      rawHeaders: exactJsonRawHeaders(body),
    });
    assert.equal(rejected.statusCode, 400);
    assert.equal(backendRequests, 1, "alias never opens a backend request");
  } finally {
    await proxy.close();
    await closeServer(backend);
  }

  await assert.rejects(
    new Promise((resolve, reject) => {
      const socket = connectPipe(frontendPipe, () => {
        socket.destroy();
        resolve();
      });
      socket.once("error", reject);
    }),
  );
});

test("S18-F4 wrapper binds an unguessable nonprojected pipe before child spawn and cleans it", async () => {
  const suffixBytes = Buffer.alloc(16, 0xab);
  const capability = createTaskPipeCapability({
    randomBytesImpl: () => suffixBytes,
  });
  assert.deepEqual(capability, {
    pipePath: `\\\\.\\pipe\\a17-s1ar-loopback-${"ab".repeat(16)}`,
    dockerHost: `npipe:////./pipe/a17-s1ar-loopback-${"ab".repeat(16)}`,
  });

  const backendPipe = uniquePipePath("wrapper-backend");
  const backend = createHttpServer((_request, response) => response.end("ok"));
  backend.listen(backendPipe);
  await once(backend, "listening");
  let spawnCount = 0;
  let observedEnvironment = null;
  let listenBeforeSpawn = false;
  const result = await runDockerCliWithLoopbackProxy({
    backendPipe,
    childExecutable: String.raw`C:\bound\supabase.exe`,
    childArguments: ["status"],
    environment: { SystemRoot: String.raw`C:\WINDOWS` },
    allowedContainerNames: loopbackProxyContainerNames,
    randomBytesImpl: () => suffixBytes,
    spawnImpl: (_executable, _arguments, options) => {
      spawnCount += 1;
      observedEnvironment = options.env;
      const child = fakeChildProcess({ stdout: "bounded-output" });
      const socket = connectPipe(capability.pipePath, () => {
        listenBeforeSpawn = true;
        socket.destroy();
      });
      socket.once("error", () => {});
      return child;
    },
  });
  await closeServer(backend);
  assert.equal(spawnCount, 1);
  assert.equal(listenBeforeSpawn, true);
  assert.deepEqual(observedEnvironment, {
    SystemRoot: String.raw`C:\WINDOWS`,
    DOCKER_HOST: capability.dockerHost,
  });
  assert.deepEqual(result, {
    exitCode: 0,
    stdout: "bounded-output",
    stderr: "",
  });
  assert.doesNotMatch(JSON.stringify(result), /a17-s1ar-loopback/u);

  const collisionServer = createHttpServer();
  collisionServer.listen(capability.pipePath);
  await once(collisionServer, "listening");
  let collisionSpawnCount = 0;
  await assert.rejects(
    runDockerCliWithLoopbackProxy({
      backendPipe,
      childExecutable: String.raw`C:\bound\supabase.exe`,
      childArguments: ["status"],
      environment: { SystemRoot: String.raw`C:\WINDOWS` },
      allowedContainerNames: loopbackProxyContainerNames,
      randomBytesImpl: () => suffixBytes,
      spawnImpl: () => {
        collisionSpawnCount += 1;
        return fakeChildProcess({});
      },
    }),
    { message: "A17_DOCKER_LOOPBACK_PROXY_LISTEN_REJECTED" },
  );
  assert.equal(collisionSpawnCount, 0);
  await closeServer(collisionServer);

  await assert.rejects(
    runDockerCliWithLoopbackProxy({
      backendPipe,
      childExecutable: String.raw`C:\bound\supabase.exe`,
      childArguments: ["status"],
      environment: { SystemRoot: String.raw`C:\WINDOWS` },
      allowedContainerNames: loopbackProxyContainerNames,
      randomBytesImpl: () => Buffer.alloc(15),
      spawnImpl: () => fakeChildProcess({}),
    }),
    { message: "A17_DOCKER_LOOPBACK_PROXY_CAPABILITY_REJECTED" },
  );
});

test("S18-F5 proxy and harness bind exact local tools with no TCP or remote dependency", () => {
  const proxy = source(urls.proxy);
  const ps = source(urls.powershell);
  assert.doesNotMatch(
    proxy,
    /from\s+["'](?:https?:|npm:|jsr:)|\bfetch\s*\(|\bconsole\.|createConnection\s*\(\s*\{[^}]*\bhost\b/iu,
  );
  assert.match(
    proxy,
    /const BACKEND_PIPE = String\.raw`\\\\\.\\pipe\\dockerDesktopLinuxEngine`/u,
  );
  assert.match(proxy, /server\.listen\(pipePath\)/u);
  assert.doesNotMatch(proxy, /server\.listen\(\s*\d|listen\(\s*\{[^}]*port/iu);
  assert.match(
    ps,
    /\$NodeExecutablePath = 'C:\\Program Files\\nodejs\\node\.exe'/u,
  );
  assert.match(
    ps,
    /\$NodeExecutableSha256 = 'd14ba95cdce1ef7dc9ad3ac74949ca5db38b27378ee30f30a23cf26f9e875a11'/u,
  );
  assert.match(
    ps,
    /\$DockerLoopbackProxyRelativePath = 'scripts\\a17-docker-loopback-api-proxy\.mjs'/u,
  );
  assert.equal(
    occurrences(
      ps,
      /Invoke-ClosedProcess -FilePath \$nodeExecutable -Arguments @\(\$dockerLoopbackProxyPath, '--supabase-executable'/gu,
    ),
    3,
    "start status and stop are the exact three proxy-routed Supabase calls",
  );
  assertOrdered(
    ps,
    [
      "Get-LowerSha256 $NodeExecutablePath",
      "$nodeExecutable = $NodeExecutablePath",
      "$dockerLoopbackProxyPath = Assert-ExactDescendant",
      "Test-Path -LiteralPath $dockerLoopbackProxyPath -PathType Leaf",
      'Assert-SourceIdentity -Stage "pre-start"',
    ],
    "Node and proxy identities are closed before runtime construction",
  );
});

test("S18-F6 upgrade-create is rejected before backend while non-create upgrade remains transparent", async () => {
  const backendPipe = uniquePipePath("upgrade-backend");
  const frontendPipe = uniquePipePath("frontend");
  let backendConnections = 0;
  let backendUpgrades = 0;
  const backend = createHttpServer();
  backend.on("connection", () => {
    backendConnections += 1;
  });
  backend.on("upgrade", (_request, socket) => {
    backendUpgrades += 1;
    socket.write(
      "HTTP/1.1 101 Switching Protocols\r\n" +
        "Connection: Upgrade\r\n" +
        "Upgrade: tcp\r\n\r\n" +
        "UPGRADED",
    );
    socket.end();
  });
  backend.listen(backendPipe);
  await once(backend, "listening");
  const proxy = await createDockerLoopbackProxyServer({
    pipePath: frontendPipe,
    backendPipe,
    allowedContainerNames: loopbackProxyContainerNames,
  });
  try {
    const hostileBody = dockerCreateBody("0.0.0.0");
    await upgradeOverPipe({
      pipePath: frontendPipe,
      method: "POST",
      target: canonicalCreateTarget,
      body: hostileBody,
    });
    assert.equal(
      backendConnections,
      0,
      "container-create upgrade is destroyed before backend connection",
    );

    const upgraded = await upgradeOverPipe({
      pipePath: frontendPipe,
      method: "POST",
      target: "/v1.51/exec/opaque/start",
      body: Buffer.alloc(0),
    });
    assert.match(upgraded, /101 Switching Protocols[\s\S]*UPGRADED/u);
    assert.equal(backendConnections, 1);
    assert.equal(backendUpgrades, 1);
  } finally {
    await proxy.close();
    await closeServer(backend);
  }
});

test("S18-F7 child output overflow settles every lifecycle promise and cleans the pipe", async () => {
  const suffixBytes = Buffer.alloc(16, 0xcd);
  const capability = createTaskPipeCapability({
    randomBytesImpl: () => suffixBytes,
  });
  const backendPipe = uniquePipePath("overflow-backend");
  const backend = createHttpServer((_request, response) => response.end("ok"));
  backend.listen(backendPipe);
  await once(backend, "listening");

  const unhandledRejections = [];
  const uncaughtExceptions = [];
  const onUnhandledRejection = (reason) => unhandledRejections.push(reason);
  const onUncaughtException = (error) => uncaughtExceptions.push(error);
  process.on("unhandledRejection", onUnhandledRejection);
  process.on("uncaughtException", onUncaughtException);
  try {
    for (const overflowStreamName of ["stdout", "stderr"]) {
      let killRequests = 0;
      let stdoutEnded = false;
      let stderrEnded = false;
      let caughtError = null;
      const spawnImpl = () => {
        const child = new EventEmitter();
        child.stdout = new PassThrough();
        child.stderr = new PassThrough();
        child.stdout.once("end", () => {
          stdoutEnded = true;
        });
        child.stderr.once("end", () => {
          stderrEnded = true;
        });
        child.kill = () => {
          killRequests += 1;
          queueMicrotask(() => child.emit("close", null, "SIGTERM"));
          setTimeout(() => {
            child.stdout.end();
            child.stderr.end();
          }, 10);
          return true;
        };
        queueMicrotask(() => {
          child[overflowStreamName].write(Buffer.alloc(8_388_609, 0x78));
        });
        return child;
      };

      try {
        await runDockerCliWithLoopbackProxy({
          backendPipe,
          childExecutable: String.raw`C:\bound\supabase.exe`,
          childArguments: ["status"],
          environment: { SystemRoot: String.raw`C:\WINDOWS` },
          allowedContainerNames: loopbackProxyContainerNames,
          randomBytesImpl: () => suffixBytes,
          spawnImpl,
        });
      } catch (error) {
        caughtError = error;
      }
      await new Promise((resolve) => setImmediate(resolve));

      assert.equal(
        caughtError?.message,
        "A17_DOCKER_LOOPBACK_PROXY_OUTPUT_REJECTED",
        `${overflowStreamName} overflow has stable precedence`,
      );
      assert.equal(
        killRequests,
        1,
        `${overflowStreamName} requests termination`,
      );
      assert.equal(
        stdoutEnded,
        true,
        "stdout collector settles before rejection",
      );
      assert.equal(
        stderrEnded,
        true,
        "stderr collector settles before rejection",
      );
      assert.deepEqual(unhandledRejections, []);
      assert.deepEqual(uncaughtExceptions, []);

      const cleanupProof = createHttpServer();
      cleanupProof.listen(capability.pipePath);
      await once(cleanupProof, "listening");
      await closeServer(cleanupProof);
    }
  } finally {
    process.off("unhandledRejection", onUnhandledRejection);
    process.off("uncaughtException", onUncaughtException);
    await closeServer(backend);
  }
});

test("S18-F8 executable main passes a closed plain environment to the child lifecycle", () => {
  const proxy = source(urls.proxy);
  assert.match(
    proxy,
    /const mainEnvironment\s*=\s*\{\s*\.\.\.process\.env\s*\};\s*assertMainEnvironment\(mainEnvironment\)/u,
    "native process.env is copied only before closed validation",
  );
  assert.match(
    proxy,
    /runDockerCliWithLoopbackProxy\(\{[\s\S]*?environment:\s*mainEnvironment,[\s\S]*?\}\)/u,
    "the validated plain environment reaches the child lifecycle",
  );
  assert.doesNotMatch(
    proxy,
    /runDockerCliWithLoopbackProxy\(\{[\s\S]*?environment:\s*process\.env/u,
    "the special native environment object is never passed to the plain-object port",
  );
});

test("S18-F9 exact nameless Realtime health helper is closed and has no host capability", async () => {
  assert.deepEqual(
    classifyDockerRequestTarget({
      method: "POST",
      target: canonicalProjectHelperCreateTarget,
      allowedContainerNames: loopbackProxyContainerNames,
    }),
    { kind: "project-helper-create" },
  );
  for (
    const [method, target] of [
      ["GET", canonicalProjectHelperCreateTarget],
      ["POST", "/containers/create"],
      ["POST", "/v1.51/CONTAINERS/create"],
      ["POST", "/v1.51/containers/%63reate"],
      ["POST", "/v1.51/containers/create?"],
      ["POST", "/v1.51/containers/create?name="],
      ["POST", "/v1.51/containers/create?extra=1"],
    ]
  ) {
    assert.throws(
      () =>
        classifyDockerRequestTarget({
          method,
          target,
          allowedContainerNames: loopbackProxyContainerNames,
        }),
      { message: "A17_DOCKER_LOOPBACK_PROXY_REQUEST_TARGET_REJECTED" },
    );
  }

  const body = projectHelperCreateBody();
  const rewritten = rewriteProjectHelperCreateRequest({
    rawHeaders: exactJsonRawHeaders(body),
    body,
  });
  assert.deepEqual(
    JSON.parse(rewritten.body.toString("utf8")),
    projectHelperCreateValue(),
  );
  assert.equal(rewritten.headers["content-type"], "application/json");
  assert.equal(
    rewritten.headers["content-length"],
    String(rewritten.body.byteLength),
  );

  const hostileMutations = [
    (value) => value.Image = "public.ecr.aws/supabase/realtime:latest",
    (value) => value.Cmd[2] += '\nSystem.cmd("id", [])',
    (value) => value.Env.push("UNKNOWN=value"),
    (value) => value.Env.push(value.Env[0]),
    (value) => value.Labels["com.supabase.cli.project"] = "other",
    (value) => value.Labels.Unknown = loopbackProxyProjectId,
    (value) => value.NetworkingConfig.EndpointsConfig = {},
    (value) => value.HostConfig.NetworkMode = "bridge",
    (value) => value.HostConfig.PortBindings = {},
    (value) => value.HostConfig.Binds = [],
    (value) => value.HostConfig.Devices = [],
    (value) => value.HostConfig.DeviceRequests = [],
    (value) => value.HostConfig.CapAdd = ["SYS_ADMIN"],
    (value) => value.HostConfig.Privileged = true,
    (value) => value.HostConfig.PublishAllPorts = true,
    (value) => value.HostConfig.ReadonlyPaths = [],
    (value) => value.HostConfig.Unknown = false,
    (value) => value.Unknown = null,
  ];
  for (const mutate of hostileMutations) {
    const value = projectHelperCreateValue();
    mutate(value);
    const hostileBody = Buffer.from(JSON.stringify(value), "utf8");
    assert.throws(
      () =>
        rewriteProjectHelperCreateRequest({
          rawHeaders: exactJsonRawHeaders(hostileBody),
          body: hostileBody,
        }),
      { message: "A17_DOCKER_LOOPBACK_PROXY_CREATE_BODY_REJECTED" },
    );
  }

  const backendPipe = uniquePipePath("helper-backend");
  const frontendPipe = uniquePipePath("frontend");
  let backendRequests = 0;
  const backend = createHttpServer((request, response) => {
    backendRequests += 1;
    request.resume();
    response.writeHead(201, { "content-type": "application/json" });
    response.end('{"Id":"local-helper"}');
  });
  backend.listen(backendPipe);
  await once(backend, "listening");
  const proxy = await createDockerLoopbackProxyServer({
    pipePath: frontendPipe,
    backendPipe,
    allowedContainerNames: loopbackProxyContainerNames,
  });
  try {
    const accepted = await requestOverPipe({
      pipePath: frontendPipe,
      method: "POST",
      target: canonicalProjectHelperCreateTarget,
      body,
      rawHeaders: exactJsonRawHeaders(body),
    });
    assert.equal(accepted.statusCode, 201);
    assert.equal(backendRequests, 1);

    const hostileValue = projectHelperCreateValue();
    hostileValue.HostConfig.Privileged = true;
    const hostileBody = Buffer.from(JSON.stringify(hostileValue), "utf8");
    const rejected = await requestOverPipe({
      pipePath: frontendPipe,
      method: "POST",
      target: canonicalProjectHelperCreateTarget,
      body: hostileBody,
      rawHeaders: exactJsonRawHeaders(hostileBody),
    });
    assert.equal(rejected.statusCode, 400);
    assert.equal(backendRequests, 1);
  } finally {
    await proxy.close();
    await closeServer(backend);
  }
});
