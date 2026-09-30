$ErrorActionPreference = 'Stop'
$testDir = Join-Path $env:TEMP 'quality-toolbox-tests'
$expected = Get-Content (Join-Path $testDir 'expected.json') -Raw | ConvertFrom-Json
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
$excel.EnableEvents = $false
$book = $null
try {
    $book = $excel.Workbooks.Open((Join-Path $testDir 'quality-filled.xlsx'), 0, $false)
    $excel.CalculateFullRebuild()
    $checked = 0
    foreach ($sheetEntry in $expected.PSObject.Properties) {
        $sheet = $book.Worksheets.Item($sheetEntry.Name)
        foreach ($cellEntry in $sheetEntry.Value.PSObject.Properties) {
            $cell = $sheet.Range($cellEntry.Name)
            $actual = $cell.Value2
            $want = [double]$cellEntry.Value
            if ($null -eq $actual -or $actual -is [string] -or [Math]::Abs([double]$actual - $want) -gt (1e-8 * [Math]::Max(1, [Math]::Abs($want)))) {
                throw "Formula mismatch $($sheetEntry.Name)!$($cellEntry.Name): actual=$actual expected=$want formula=$($cell.Formula)"
            }
            $checked++
            [void][Runtime.InteropServices.Marshal]::ReleaseComObject($cell)
        }
        [void][Runtime.InteropServices.Marshal]::ReleaseComObject($sheet)
    }
    $spc = $book.Worksheets.Item('SPC')
    $spc.Range('B22').Value2 = 50.6
    $dfmea = $book.Worksheets.Item('DFMEA')
    $dfmea.Range('F9').Value2 = 9
    $msaData = $book.Worksheets.Item('MSA Data')
    $msaData.Range('D8').Value2 = 8.4
    $excel.CalculateFullRebuild()
    if ([Math]::Abs($spc.Range('F8').Value2 - 50.91) -gt 1e-8) {throw 'SPC edit did not recalculate'}
    if ($dfmea.Range('L9').Value2 -ne 108) {throw 'FMEA edit did not recalculate'}
    if ([Math]::Abs($book.Worksheets.Item('MSA').Range('F8').Value2 - (20 + 0.1/12)) -gt 1e-8) {throw 'MSA edit did not recalculate'}
    $spc.Range('B22').Value2 = 49.6
    $dfmea.Range('F9').Value2 = 8
    $msaData.Range('D8').Value2 = 8.3
    $excel.CalculateFullRebuild()
    $book.Save()
    foreach ($name in @('SPC','MSA','DFMEA')) {
        $sheet = $book.Worksheets.Item($name)
        $sheet.ExportAsFixedFormat(0, (Join-Path $testDir ($name + '.pdf')))
        [void][Runtime.InteropServices.Marshal]::ReleaseComObject($sheet)
    }
    $book.Close($false)
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($book)
    $book = $excel.Workbooks.Open((Join-Path $testDir 'quality-blank.xlsx'), 0, $false)
    $excel.CalculateFullRebuild()
    foreach ($sheet in $book.Worksheets) {
        foreach ($cell in $sheet.UsedRange.Cells) {
            if ($cell.HasFormula -and $excel.WorksheetFunction.IsError($cell)) {throw "Formula error in blank template: $($sheet.Name)!$($cell.Address())"}
            [void][Runtime.InteropServices.Marshal]::ReleaseComObject($cell)
        }
        [void][Runtime.InteropServices.Marshal]::ReleaseComObject($sheet)
    }
    $book.Save()
    Write-Output "PASS: $checked cached values independently recalculated by Microsoft Excel; changes propagate in FMEA, SPC and MSA; blank templates have no formula errors."
} finally {
    if ($null -ne $book) {$book.Close($false);[void][Runtime.InteropServices.Marshal]::ReleaseComObject($book)}
    $excel.Quit()
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($excel)
    [GC]::Collect();[GC]::WaitForPendingFinalizers()
}
