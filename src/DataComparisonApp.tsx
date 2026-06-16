import React, { useState, useRef, useEffect } from "react";
import Plot from "react-plotly.js";
import Papa from "papaparse";

// Format a number to scientific notation with 1 decimal place
const formatScientificNotation = (value) => {
  // Parse the value to a number
  const num = parseFloat(value);
  if (isNaN(num)) return "1.0e+0";

  // Use toExponential with 1 decimal place
  return num.toExponential(1);
};

// Component for data import form
const DataImportForm = ({
  onSubmit,
  onCancel,
  exportOption,
  setExportOption,
  exportToCSV,
  exportFilename,
  setExportFilename,
}) => {
  const [file, setFile] = useState(null);
  const [config, setConfig] = useState({
    name: "",
    color: "#" + Math.floor(Math.random() * 16777215).toString(16),
    delimiter: ",",
    startRow: 0,
    xKey: "",
    yKey: "",
  });
  const [previewData, setPreviewData] = useState(null);
  const [headers, setHeaders] = useState([]);

  // Update all preview data when any import setting changes
  const updatePreview = (updatedConfig) => {
    if (!file) return;

    parseFile(file, updatedConfig.delimiter, updatedConfig.startRow);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseFile(selectedFile, config.delimiter, config.startRow);
    }
  };

  // Handle any config change
  const handleConfigChange = (key, value) => {
    // Create updated config object
    const updatedConfig = { ...config, [key]: value };

    // Important: ensure X and Y keys are not reset
    if (key !== "xKey" && key !== "yKey") {
      // For non-column selections, update preview
      setConfig(updatedConfig);
      updatePreview(updatedConfig);
    } else {
      // For column selections, just update the config
      setConfig(updatedConfig);
    }
  };

  // Parse file function to handle both initial loading and config changes
  const parseFile = (selectedFile, delimiter, startRow = 0) => {
    // First read the file as text to examine its structure
    const reader = new FileReader();
    reader.onload = (e) => {
      const fileText = e.target!.result as string;

      // Split into lines and take into account the start row
      const lines = fileText.split("\n").filter((line) => line.trim() !== "");

      if (startRow >= lines.length) {
        setPreviewData(null);
        setHeaders([]);
        alert(
          "Start row exceeds file length. Please choose a lower start row."
        );
        return;
      }

      // Get effective lines after start row
      const effectiveLines = lines.slice(startRow);

      if (effectiveLines.length === 0) {
        setPreviewData(null);
        setHeaders([]);
        return;
      }

      // Always treat numeric data as columnar data
      // Split the first line to determine number of columns
      const firstLine = effectiveLines[0];
      const columns = firstLine.split(delimiter).map((item) => item.trim());
      const columnCount = columns.length;

      // Create artificial column names for all data
      const artificialHeaders = Array.from(
        { length: columnCount },
        (_, i) => `Column ${i + 1}`
      );
      setHeaders(artificialHeaders);

      // Set default X and Y columns
      if (columnCount >= 2) {
        setConfig((prev) => {
          // Only change xKey/yKey if they're empty or not in the new headers
          const newXKey =
            !prev.xKey || !artificialHeaders.includes(prev.xKey)
              ? artificialHeaders[0]
              : prev.xKey;

          const newYKey =
            !prev.yKey || !artificialHeaders.includes(prev.yKey)
              ? artificialHeaders[1]
              : prev.yKey;

          return {
            ...prev,
            xKey: newXKey,
            yKey: newYKey,
          };
        });
      }

      // Process raw CSV data
      // Use PapaParse in a simplified way
      const rows = [];
      for (let i = 0; i < Math.min(5, effectiveLines.length); i++) {
        const line = effectiveLines[i];
        const values = line.split(delimiter).map((item) => item.trim());
        const row = {};

        for (let j = 0; j < columnCount; j++) {
          if (j < values.length) {
            // Try to convert to number if possible
            const value = values[j];
            const numValue = parseFloat(value);
            row[artificialHeaders[j]] = !isNaN(numValue) ? numValue : value;
          } else {
            row[artificialHeaders[j]] = "";
          }
        }

        rows.push(row);
      }

      setPreviewData({
        data: rows,
        meta: { fields: artificialHeaders },
      });
    };
    reader.readAsText(selectedFile);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (file) {
      onSubmit(file, config);
    }
  };

  return (
    <div
      style={{ border: "1px solid #ccc", padding: "10px", marginTop: "10px" }}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ width: "48%" }}>
          <div>
            <div>Import data:</div>
            <div style={{ marginBottom: "5px" }}>
              <div>Select CSV File:</div>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                style={{ width: "100%" }}
              />
            </div>
            <div style={{ marginBottom: "5px" }}>
              <div>Name:</div>
              <div style={{ display: "flex" }}>
                <input
                  type="text"
                  value={config.name}
                  onChange={(e) => handleConfigChange("name", e.target.value)}
                  placeholder={file?.name}
                  style={{ width: "100%", marginRight: "5px" }}
                />
                <input
                  type="color"
                  value={config.color}
                  onChange={(e) => handleConfigChange("color", e.target.value)}
                />
              </div>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "5px",
              }}
            >
              <div style={{ width: "48%" }}>
                <div>Delimiter</div>
                <select
                  value={config.delimiter}
                  onChange={(e) =>
                    handleConfigChange("delimiter", e.target.value)
                  }
                  style={{ width: "100%" }}
                >
                  <option value=",">Comma (,)</option>
                  <option value=";">Semicolon (;)</option>
                  <option value="\t">Tab</option>
                </select>
              </div>
              <div style={{ width: "48%" }}>
                <div>Start row</div>
                <input
                  type="number"
                  min="0"
                  value={config.startRow}
                  onChange={(e) =>
                    handleConfigChange(
                      "startRow",
                      parseInt(e.target.value) || 0
                    )
                  }
                  style={{ width: "100%" }}
                />
              </div>
            </div>
            {headers.length > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ width: "48%" }}>
                  <div>X-Axis column</div>
                  <select
                    value={config.xKey}
                    onChange={(e) => handleConfigChange("xKey", e.target.value)}
                    style={{ width: "100%" }}
                  >
                    {headers.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ width: "48%" }}>
                  <div>Y-Axis column</div>
                  <select
                    value={config.yKey}
                    onChange={(e) => handleConfigChange("yKey", e.target.value)}
                    style={{ width: "100%" }}
                  >
                    {headers.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            <div style={{ marginTop: "10px" }}>
              <button onClick={onCancel} style={{ marginRight: "5px" }}>
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={!file}>
                Confirm
              </button>
            </div>
          </div>
        </div>
        <div style={{ width: "48%" }}>
          <div>Data preview</div>
          <div
            style={{
              border: "1px solid #ccc",
              height: "150px",
              overflow: "auto",
            }}
          >
            {previewData ? (
              <table style={{ width: "100%" }}>
                <thead>
                  <tr>
                    {headers.map((header) => (
                      <th
                        key={header}
                        style={{ textAlign: "left", padding: "2px" }}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.data.map((row, i) => (
                    <tr key={i}>
                      {headers.map((header) => (
                        <td key={header} style={{ padding: "2px" }}>
                          {String(row[header] || "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "100%",
                }}
              >
                No data to preview
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const DataComparisonApp = () => {
  // All state variables defined at the top
  const [datasets, setDatasets] = useState<any[]>([]);
  const [showImportForm, setShowImportForm] = useState(false);
  const [xOffsets, setXOffsets] = useState({});
  const [axisTitles, setAxisTitles] = useState({
    xAxis: "X Axis",
    yAxisLeft: "Y Axis (Left)",
    yAxisRight: "Y Axis (Right)",
  });
  const [exportOption, setExportOption] = useState("visible");
  const [exportFilename, setExportFilename] = useState("Zoomed in data");
  const plotRef = useRef(null);
  const [draggingId, setDraggingId] = useState(null);
  const [currentLayout, setCurrentLayout] = useState<any>(null);

  // New state for cursor functionality
  const [showCursors, setShowCursors] = useState(false);
  const [cursor1, setCursor1] = useState<number | null>(null);
  const [cursor2, setCursor2] = useState<number | null>(null);
  const [cursorStep, setCursorStep] = useState(0.001);

  // State variables for axis scale types
  const [xAxisScale, setXAxisScale] = useState("linear");
  const [yAxisLeftScale, setYAxisLeftScale] = useState("linear");
  const [yAxisRightScale, setYAxisRightScale] = useState("linear");

  const [nextIntegralBoxId, setNextIntegralBoxId] = useState(2);

  // Slope tool state
  const [showSlope, setShowSlope] = useState(false);
  // Line size is interpreted as a percentage of the current viewport diagonal
  const [slopeLineSize, setSlopeLineSize] = useState(50);
  const [slopeSmoothingPoints, setSlopeSmoothingPoints] = useState(1);
  const [showSlopeTool, setShowSlopeTool] = useState(false);

  // Order of the reorderable tool blocks (drag the gray handle on the left)
  const [blockOrder, setBlockOrder] = useState<string[]>([
    "cursors",
    "dataSeries",
    "slope",
    "combined",
    "customEq",
    "axisTitles",
    "export",
    "integral",
    "axisScale",
  ]);
  const [draggingBlock, setDraggingBlock] = useState<string | null>(null);

  const [currentSlope, setCurrentSlope] = useState<number | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<any>(null);
  const [fixedPoint, setFixedPoint] = useState<any>(null);

  // New state for integral functionality
  const [integralBoxes, setIntegralBoxes] = useState([
    { id: 1, plotId: "", result: "" },
  ]);

  // === CUSTOM EQUATION STATE (with eqDatasetId: number | null) ===
  const [customEquations, setCustomEquations] = useState([
    {
      id: 1,
      name: "",
      equation: "",
      eqDatasetId: null, // can be null or a number
      isActive: false,
    },
  ]);
  const [nextEquationId, setNextEquationId] = useState(2);
  const [yOffsets, setYOffsets] = useState({});

  // Add a new empty equation row
  const addCustomEquation = () => {
    setCustomEquations((prev) => [
      ...prev,
      {
        id: nextEquationId,
        name: "",
        equation: "",
        eqDatasetId: null,
        isActive: false,
      },
    ]);
    setNextEquationId((prev) => prev + 1);
  };

  // Remove a custom equation row (and remove its dataset if already created)
  const removeCustomEquation = (id) => {
    // Get the equation we're about to remove
    const eqToRemove = customEquations.find((eq) => eq.id === id);
    const datasetId = eqToRemove?.eqDatasetId;

    // First deactivate the equation to prevent recreation
    setCustomEquations((prev) =>
      prev.map((eq) => (eq.id === id ? { ...eq, isActive: false } : eq))
    );

    // Use setTimeout to ensure the deactivation is processed first
    setTimeout(() => {
      // Then remove the equation
      setCustomEquations((prev) => prev.filter((eq) => eq.id !== id));

      // And if it has a dataset, remove that too
      if (datasetId) {
        setDatasets((prev) => prev.filter((ds) => ds.id !== datasetId));
      }
    }, 0);
  };

  // Handle changes to the name or equation fields
  const handleCustomEquationChange = (id, field, value) => {
    setCustomEquations((prev) =>
      prev.map((eq) => (eq.id === id ? { ...eq, [field]: value } : eq))
    );
  };

  // If user presses Enter in the equation field, confirm
  const handleEquationKeyDown = (e, eqId) => {
    if (e.key === "Enter") {
      confirmCustomEquation(eqId);
    }
  };
  // === END CUSTOM EQUATION STATE ===

  // Generate a random color for new datasets
  const generateColor = () => {
    const letters = "0123456789ABCDEF";
    let color = "#";
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  };

  // Set initial cursor positions when a dataset is loaded
  useEffect(() => {
    if (datasets.length > 0 && cursor1 === null && cursor2 === null) {
      // Find the global min and max x values across all datasets
      let xMin = Infinity;
      let xMax = -Infinity;

      datasets.forEach((dataset) => {
        dataset.data.forEach((row) => {
          const x = parseFloat(row[dataset.xKey]) + (xOffsets[dataset.id] || 0);
          if (!isNaN(x)) {
            xMin = Math.min(xMin, x);
            xMax = Math.max(xMax, x);
          }
        });
      });

      if (xMin !== Infinity && xMax !== -Infinity) {
        const range = xMax - xMin;
        setCursor1(xMin + range * 0.25);
        setCursor2(xMin + range * 0.75);
      }
    }
  }, [datasets, xOffsets]);

  // Add this useEffect to preserve zoom when offsets change
  useEffect(() => {
    if (currentLayout && Object.keys(currentLayout).length > 0) {
      // Make a shallow copy of the current layout to avoid direct mutation
      const layoutCopy = { ...currentLayout };

      // Apply it in the next animation frame to ensure all other updates are complete
      requestAnimationFrame(() => {
        if (plotRef.current) {
          // Use Plotly's relayout method to apply the preserved layout
          const plot = plotRef.current.el;
          if (plot && plot.layout) {
            (window as any).Plotly.relayout(plot, layoutCopy);
          }
        }
      });
    }
  }, [xOffsets, yOffsets]);

  // Adjust cursors to fit current zoom level when toggled on
  useEffect(() => {
    if (showCursors && currentLayout?.xaxis?.range) {
      const xMin = parseFloat(currentLayout.xaxis.range[0]);
      const xMax = parseFloat(currentLayout.xaxis.range[1]);

      // Check if cursors are outside visible range
      const cursor1Outside =
        cursor1 === null || cursor1 < xMin || cursor1 > xMax;
      const cursor2Outside =
        cursor2 === null || cursor2 < xMin || cursor2 > xMax;

      // Only reposition cursors that are out of view
      if (cursor1Outside || cursor2Outside) {
        // Use different calculation based on axis type
        if (xAxisScale === "log") {
          // For log scale, we need to interpolate in log space
          const logMin = Math.log10(Math.max(0.0001, xMin)); // Prevent log(0)
          const logMax = Math.log10(Math.max(0.0001, xMax));

          if (cursor1Outside) {
            const logPos = logMin + (logMax - logMin) * 0.25;
            setCursor1(Math.pow(10, logPos));
          }

          if (cursor2Outside) {
            const logPos = logMin + (logMax - logMin) * 0.75;
            setCursor2(Math.pow(10, logPos));
          }
        } else {
          // Linear scale - use direct linear interpolation
          const visibleRange = xMax - xMin;

          if (cursor1Outside) {
            setCursor1(xMin + visibleRange * 0.25);
          }

          if (cursor2Outside) {
            setCursor2(xMin + visibleRange * 0.75);
          }
        }
      }
    }
  }, [showCursors, currentLayout?.xaxis?.range, xAxisScale]);

  // Handle plot updates and zoom preservation
  // Handle plot updates and zoom preservation
  const handlePlotUpdate = (e) => {
    // Don't update layout when slope tool is active to preserve zoom
    if (showSlopeTool) return;

    if (e && e.layout) {
      // Check if we have a valid layout update
      let shouldUpdateLayout = false;

      // Check for X-axis changes
      if (e.layout.xaxis && e.layout.xaxis.range) {
        const newXRange = e.layout.xaxis.range;
        // Compare with current X range
        if (
          !currentLayout ||
          !currentLayout.xaxis ||
          !currentLayout.xaxis.range ||
          currentLayout.xaxis.range[0] !== newXRange[0] ||
          currentLayout.xaxis.range[1] !== newXRange[1]
        ) {
          shouldUpdateLayout = true;
        }
      }

      // Check for Y-axis changes (left axis)
      if (e.layout.yaxis && e.layout.yaxis.range) {
        const newYRange = e.layout.yaxis.range;
        // Compare with current Y range
        if (
          !currentLayout ||
          !currentLayout.yaxis ||
          !currentLayout.yaxis.range ||
          currentLayout.yaxis.range[0] !== newYRange[0] ||
          currentLayout.yaxis.range[1] !== newYRange[1]
        ) {
          shouldUpdateLayout = true;
        }
      }

      // Check for Y-axis changes (right axis)
      if (e.layout.yaxis2 && e.layout.yaxis2.range) {
        const newY2Range = e.layout.yaxis2.range;
        // Compare with current Y2 range
        if (
          !currentLayout ||
          !currentLayout.yaxis2 ||
          !currentLayout.yaxis2.range ||
          currentLayout.yaxis2.range[0] !== newY2Range[0] ||
          currentLayout.yaxis2.range[1] !== newY2Range[1]
        ) {
          shouldUpdateLayout = true;
        }
      }

      // If any axis has changed, update the layout
      if (shouldUpdateLayout) {
        // Remove shapes to avoid duplicating cursor lines
        const { shapes, ...layoutWithoutShapes } = e.layout;
        setCurrentLayout(layoutWithoutShapes);
      }
    }
  };

  // Add cursor movement functions
  const moveCursor = (cursorNumber, direction) => {
    const stepValue = parseFloat(String(cursorStep)) || 0.001;

    if (cursorNumber === 1 && cursor1 !== null) {
      if (xAxisScale === "log") {
        // For log scale, we multiply/divide instead of add/subtract
        setCursor1((prev) =>
          direction > 0 ? prev * (1 + stepValue) : prev / (1 + stepValue)
        );
      } else {
        setCursor1((prev) => prev + direction * stepValue);
      }
    } else if (cursorNumber === 2 && cursor2 !== null) {
      if (xAxisScale === "log") {
        setCursor2((prev) =>
          direction > 0 ? prev * (1 + stepValue) : prev / (1 + stepValue)
        );
      } else {
        setCursor2((prev) => prev + direction * stepValue);
      }
    }
  };

  // Function to update cursor values directly from input
  const setCursorValue = (cursorNumber, value) => {
    const numValue = parseFloat(value);

    if (!isNaN(numValue)) {
      if (cursorNumber === 1) {
        setCursor1(numValue);
      } else if (cursorNumber === 2) {
        setCursor2(numValue);
      }
    }
  };

  // Function to calculate derivative at a point
  // Function to calculate derivative at a point
  // Function to calculate derivative at a point
  const calculateDerivativeAtPoint = (datasetId, xValue) => {
    const dataset = datasets.find((ds) => ds.id === datasetId);
    if (!dataset) return null;

    // Get all points with offsets applied
    const points = [];
    dataset.data.forEach((row) => {
      const x = parseFloat(row[dataset.xKey]) + (xOffsets[dataset.id] || 0);
      const y = parseFloat(row[dataset.yKey]) + (yOffsets[dataset.id] || 0);
      if (!isNaN(x) && !isNaN(y)) {
        points.push({ x, y });
      }
    });

    // Sort by x value
    points.sort((a, b) => a.x - b.x);

    // Find the closest point
    let closestIndex = -1;
    let minDistance = Infinity;

    for (let i = 0; i < points.length; i++) {
      const distance = Math.abs(points[i].x - xValue);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    }

    if (closestIndex === -1) return null;

    // Calculate how many points to average on each side
    const pointsToAverage = Math.max(1, Math.floor(slopeSmoothingPoints / 2));

    // Get average of points before current point
    let avgPointBefore = { x: 0, y: 0 };
    let countBefore = 0;

    for (
      let i = Math.max(0, closestIndex - pointsToAverage);
      i < closestIndex;
      i++
    ) {
      avgPointBefore.x += points[i].x;
      avgPointBefore.y += points[i].y;
      countBefore++;
    }

    if (countBefore > 0) {
      avgPointBefore.x /= countBefore;
      avgPointBefore.y /= countBefore;
    } else {
      // If no points before, use current point
      avgPointBefore = points[closestIndex];
    }

    // Get average of points after current point (including current)
    let avgPointAfter = { x: 0, y: 0 };
    let countAfter = 0;

    for (
      let i = closestIndex;
      i <= Math.min(points.length - 1, closestIndex + pointsToAverage);
      i++
    ) {
      avgPointAfter.x += points[i].x;
      avgPointAfter.y += points[i].y;
      countAfter++;
    }

    if (countAfter > 0) {
      avgPointAfter.x /= countAfter;
      avgPointAfter.y /= countAfter;
    } else {
      // If no points after, use current point
      avgPointAfter = points[closestIndex];
    }

    // Calculate slope between averaged points
    let slope = 0;
    if (avgPointAfter.x !== avgPointBefore.x) {
      slope =
        (avgPointAfter.y - avgPointBefore.y) /
        (avgPointAfter.x - avgPointBefore.x);
    }

    // Return current point position but with smoothed slope
    return {
      x: points[closestIndex].x,
      y: points[closestIndex].y,
      slope: slope,
      previousX: avgPointBefore.x,
      previousY: avgPointBefore.y,
      datasetId: datasetId,
    };
  };

  // Debounce function to prevent excessive updates
  const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  // Create debounced version of hover update
  const debouncedHoverUpdate = debounce((derivativeInfo) => {
    setHoveredPoint(derivativeInfo);
    setCurrentSlope(derivativeInfo ? derivativeInfo.slope : null);
  }, 50); // 50ms delay

  // Function to calculate the integral for a specific plot between cursors
  const calculateIntegral = (plotId) => {
    if (!plotId || cursor1 === null || cursor2 === null) {
      return "";
    }

    const selectedDataset = datasets.find((ds) => ds.id.toString() === plotId);
    if (!selectedDataset) return "";

    // Get the data points for the selected dataset with offset applied
    const points = [];
    selectedDataset.data.forEach((row) => {
      // Fixed
      const x =
        parseFloat(row[selectedDataset.xKey]) +
        (xOffsets[selectedDataset.id] || 0);
      const y =
        parseFloat(row[selectedDataset.yKey]) +
        (yOffsets[selectedDataset.id] || 0);
      if (!isNaN(x) && !isNaN(y)) {
        points.push([x, y]);
      }
    });

    // Sort by x value
    points.sort((a, b) => a[0] - b[0]);

    // Determine the x range for integration
    const xMin = Math.min(cursor1, cursor2);
    const xMax = Math.max(cursor1, cursor2);

    // Filter points within the cursor range and add boundary points
    let pointsInRange = points.filter((p) => p[0] >= xMin && p[0] <= xMax);

    // Find or interpolate points at the cursor positions if needed
    let addedBoundaryPoints = false;

    // Check if we need to add a point at xMin
    if (!pointsInRange.some((p) => Math.abs(p[0] - xMin) < 1e-10)) {
      // Find points before and after xMin for interpolation
      let leftPoint = null;
      let rightPoint = null;

      for (let i = 0; i < points.length; i++) {
        if (points[i][0] < xMin) {
          leftPoint = points[i];
        } else {
          rightPoint = points[i];
          break;
        }
      }

      // If we can interpolate, add the boundary point
      if (leftPoint && rightPoint) {
        const [x1, y1] = leftPoint;
        const [x2, y2] = rightPoint;
        const y = y1 + ((xMin - x1) * (y2 - y1)) / (x2 - x1);
        pointsInRange.unshift([xMin, y]);
        addedBoundaryPoints = true;
      }
    }

    // Check if we need to add a point at xMax
    if (!pointsInRange.some((p) => Math.abs(p[0] - xMax) < 1e-10)) {
      // Find points before and after xMax for interpolation
      let leftPoint = null;
      let rightPoint = null;

      for (let i = 0; i < points.length; i++) {
        if (points[i][0] <= xMax) {
          leftPoint = points[i];
        } else {
          rightPoint = points[i];
          break;
        }
      }

      // If we can interpolate, add the boundary point
      if (leftPoint && rightPoint) {
        const [x1, y1] = leftPoint;
        const [x2, y2] = rightPoint;
        const y = y1 + ((xMax - x1) * (y2 - y1)) / (x2 - x1);
        pointsInRange.push([xMax, y]);
        addedBoundaryPoints = true;
      }
    }

    // If we added boundary points, sort again to ensure correct order
    if (addedBoundaryPoints) {
      pointsInRange.sort((a, b) => a[0] - b[0]);
    }

    // Calculate the area using trapezoidal rule
    let area = 0;
    for (let i = 1; i < pointsInRange.length; i++) {
      const [x1, y1] = pointsInRange[i - 1];
      const [x2, y2] = pointsInRange[i];
      // Area of trapezoid: (x2 - x1) * (y1 + y2) / 2
      area += ((x2 - x1) * (y1 + y2)) / 2;
    }

    // Return the result
    return area.toFixed(6);
  };

  // Function to update integral results when cursors change
  const updateIntegralResults = () => {
    setIntegralBoxes((prev) =>
      prev.map((box) => ({
        ...box,
        result: box.plotId ? calculateIntegral(box.plotId) : "",
      }))
    );
  };

  // Update results when cursors, datasets, or y-axis settings change
  // Update results when cursors, datasets, or y-axis settings change
  useEffect(() => {
    if (cursor1 !== null && cursor2 !== null) {
      updateIntegralResults();
    }
  }, [
    cursor1,
    cursor2,
    datasets,
    xOffsets,
    yOffsets, // Add this line to trigger updates when Y offsets change
    JSON.stringify(
      datasets.map((ds) => ({ id: ds.id, yAxisSide: ds.yAxisSide }))
    ),
  ]);

  // === NEW useEffect FOR CUSTOM EQUATIONS (Union approach) ===
  useEffect(() => {
    // For each custom equation that is active, generate or update its dataset
    customEquations.forEach((eq) => {
      if (!eq.isActive || !eq.equation.trim()) return;

      // 1) Collect union of all X from non-equation datasets
      let allXValues = new Set<number>();
      datasets.forEach((ds) => {
        if (ds.isEquation) return; // skip other eq if you want
        ds.data.forEach((row) => {
          const xVal = parseFloat(row[ds.xKey]) + (xOffsets[ds.id] || 0);
          if (!isNaN(xVal)) {
            allXValues.add(xVal);
          }
        });
      });
      if (allXValues.size === 0) {
        // no real data, default
        allXValues.add(0);
        allXValues.add(1);
        allXValues.add(2);
      }
      const sortedXValues = [...allXValues].sort((a, b) => a - b);

      // 2) Build the function from eq.equation
      // 2) Build the function from eq.equation
      let fn;
      try {
        // Replace ^ with ** for proper exponentiation first
        const processedEquation = eq.equation.replace(
          /(\b[a-z0-9.]+)\s*\^\s*(\b[a-z0-9.]+)/gi,
          "Math.pow($1, $2)"
        );

        fn = new Function(
          "x",
          `
          // Make Math functions available in the equation
          const {sin, cos, tan, pow, sqrt, abs, log, exp, PI} = Math;
          return (${processedEquation});
        `
        );
        fn(0); // quick test
      } catch (err) {
        console.error("Error creating function from equation:", err);
        return;
      }

      // 3) Generate more X values for a smoother curve
      let xMin = Infinity,
        xMax = -Infinity;
      if (allXValues.size > 0) {
        // Find min and max X from existing data
        sortedXValues.forEach((x) => {
          xMin = Math.min(xMin, x);
          xMax = Math.max(xMax, x);
        });
      } else {
        // Default range if no data
        xMin = -5;
        xMax = 5;
      }

      // Create a denser set of X values for smoother plotting
      const pointCount = 500; // Increase this for smoother curves
      const step = (xMax - xMin) / pointCount;
      const denseXValues = [];
      for (let i = 0; i <= pointCount; i++) {
        denseXValues.push(xMin + i * step);
      }

      // 4) Evaluate for each X
      const newData = [];
      denseXValues.forEach((xVal) => {
        let yVal;
        try {
          yVal = fn(xVal);
        } catch (err) {
          yVal = NaN;
        }
        if (!isNaN(yVal) && isFinite(yVal)) {
          newData.push({
            "Column 1": xVal,
            "Column 2": yVal,
          });
        }
      });

      if (newData.length === 0) {
        // skip if no valid points
        return;
      }

      // 4) Insert or update the dataset
      setDatasets((prevDs) => {
        // find if we already have eqDatasetId
        const existing = prevDs.find((d) => d.id === eq.eqDatasetId);
        if (!existing) {
          // create a new dataset
          const newId = Date.now();
          const newDataset = {
            id: newId,
            name: eq.name.trim() || eq.equation,
            color: generateColor(),
            xKey: "Column 1",
            yKey: "Column 2",
            data: newData,
            visible: true,
            step: "0.001",
            yAxisSide: "left",
            isEquation: true,
          };
          // update eqDatasetId
          setCustomEquations((prevEqs) =>
            prevEqs.map((e) =>
              e.id === eq.id ? { ...e, eqDatasetId: newId } : e
            )
          );
          return [...prevDs, newDataset];
        } else {
          // update existing dataset
          const updated = {
            ...existing,
            name: eq.name.trim() || eq.equation,
            data: newData,
          };
          return prevDs.map((d) => (d.id === existing.id ? updated : d));
        }
      });
    });
  }, [customEquations, xOffsets]); // Remove datasets from dependencies

  // Reset fixed point when tool is toggled off
  useEffect(() => {
    if (!showSlopeTool) {
      setFixedPoint(null);
      setHoveredPoint(null);
      setCurrentSlope(null);
    }
  }, [showSlopeTool]);

  // Add a new integral box
  const addIntegralBox = () => {
    setIntegralBoxes((prev) => [
      ...prev,
      { id: nextIntegralBoxId, plotId: "", result: "" },
    ]);
    setNextIntegralBoxId((prev) => prev + 1);
  };

  // Remove an integral box
  const removeIntegralBox = (id) => {
    setIntegralBoxes((prev) => prev.filter((box) => box.id !== id));
  };

  // Update plotId for an integral box
  const updateIntegralPlotId = (id, plotId) => {
    setIntegralBoxes((prev) =>
      prev.map((box) =>
        box.id === id
          ? { ...box, plotId, result: calculateIntegral(plotId) }
          : box
      )
    );
  };

  // Simplified plot click handler for cursor positioning
  const handlePlotClick = (e) => {
    if (!e.points || !e.points[0]) return;

    // Handle cursor functionality
    if (showCursors) {
      const xVal = e.points[0].x;

      if (cursor1 === null || cursor2 === null) {
        if (cursor1 === null) {
          setCursor1(xVal);
        } else {
          setCursor2(xVal);
        }
      } else {
        if (xAxisScale === "log") {
          const logXVal = Math.log10(Math.max(0.0001, xVal));
          const logCursor1 = Math.log10(Math.max(0.0001, cursor1));
          const logCursor2 = Math.log10(Math.max(0.0001, cursor2));
          const dist1 = Math.abs(logXVal - logCursor1);
          const dist2 = Math.abs(logXVal - logCursor2);
          if (dist1 < dist2) {
            setCursor1(xVal);
          } else {
            setCursor2(xVal);
          }
        } else {
          const dist1 = Math.abs(xVal - cursor1);
          const dist2 = Math.abs(xVal - cursor2);
          if (dist1 < dist2) {
            setCursor1(xVal);
          } else {
            setCursor2(xVal);
          }
        }
      }
    }

    // Handle slope tool functionality
    if (showSlopeTool && hoveredPoint) {
      setFixedPoint(hoveredPoint);
    }
  };

  const handlePlotHover = (e) => {
    if (!showSlopeTool || fixedPoint) return;

    if (e.points && e.points[0] && e.points[0].curveNumber !== undefined) {
      const pointData = e.points[0];
      const datasetIndex = pointData.curveNumber;

      // Make sure it's a dataset curve, not an integral or slope visual
      if (datasetIndex < datasets.length) {
        const dataset = datasets[datasetIndex];
        const derivativeInfo = calculateDerivativeAtPoint(
          dataset.id,
          pointData.x
        );

        if (derivativeInfo) {
          debouncedHoverUpdate(derivativeInfo);
        }
      }
    }
  };

  const handlePlotUnhover = () => {
    if (!showSlopeTool || fixedPoint) return;
    if (!fixedPoint) {
      debouncedHoverUpdate(null);
    }
  };

  // === NEW confirmCustomEquation: only sets isActive ===
  const confirmCustomEquation = (id) => {
    setCustomEquations((prev) =>
      prev.map((eq) => (eq.id === id ? { ...eq, isActive: true } : eq))
    );
  };
  // === END NEW confirmCustomEquation ===

  // Function to export visible data to CSV with enhanced linear interpolation
  const exportToCSV = () => {
    // Check if we have any datasets
    if (datasets.length === 0) {
      alert("No data to export");
      return;
    }

    // Get current view range from the plot layout
    const xRange = currentLayout?.xaxis?.range || null;

    // If no range is available (hasn't zoomed), use the full range
    let xMin = -Infinity;
    let xMax = Infinity;

    if (xRange) {
      xMin = parseFloat(xRange[0]);
      xMax = parseFloat(xRange[1]);
      console.log(`Exporting range: ${xMin} to ${xMax}`);
    }

    // Filter datasets based on export option
    const datasetsToExport =
      exportOption === "visible"
        ? datasets.filter((ds) => ds.visible !== false)
        : datasets;

    if (datasetsToExport.length === 0) {
      alert("No visible datasets to export");
      return;
    }

    // Get the actual plot data for each dataset
    const actualPlotDatasets = plotlyData.filter((plotData) => {
      const datasetIndex = datasetsToExport.findIndex(
        (ds) => ds.name === plotData.name
      );
      return datasetIndex >= 0;
    });

    // Collect all x-values within the visible range across all datasets
    let allXValues = new Set<number>();

    actualPlotDatasets.forEach((plotData) => {
      if (plotData.x && plotData.x.length > 0) {
        plotData.x.forEach((x) => {
          // Use the exact x-values from the plot data
          if (x >= xMin && x <= xMax) {
            allXValues.add(x);
          }
        });
      }
    });

    // Convert to array and sort
    const sortedXValues = Array.from(allXValues).sort((a, b) => a - b);

    if (sortedXValues.length === 0) {
      alert("No data points in the current view range");
      return;
    }

    // Preprocess datasets to identify and collect valid data points for better interpolation
    const processedDatasets = actualPlotDatasets.map((plotData) => {
      const validPoints = [];

      // Function to determine if a value is considered "valid" (not null, not too close to zero)
      const isValidValue = (val) => {
        if (val === null || val === undefined || val === "") return false;
        if (typeof val === "number" && Math.abs(val) < 1e-4) return false; // Treat very small values as null
        return true;
      };

      // Collect valid [x,y] pairs
      if (plotData.x && plotData.y) {
        for (let i = 0; i < plotData.x.length; i++) {
          if (isValidValue(plotData.y[i])) {
            validPoints.push([plotData.x[i], plotData.y[i]]);
          }
        }
      }

      return {
        name: plotData.name,
        validPoints: validPoints.sort((a, b) => a[0] - b[0]), // Sort by x value
      };
    });

    // Create CSV header row with semicolon separator
    let csvContent = "time";
    datasetsToExport.forEach((dataset) => {
      csvContent += ";" + dataset.name;
    });
    csvContent += "\n";

    // Interpolation function
    const interpolate = (x, points) => {
      // If no valid points, return empty
      if (!points || points.length === 0) return "";

      // If only one point, return its y value
      if (points.length === 1) return points[0][1];

      // Find the closest points before and after x
      let beforePoint = null;
      let afterPoint = null;

      for (let i = 0; i < points.length; i++) {
        if (points[i][0] < x) {
          beforePoint = points[i];
        } else if (points[i][0] > x) {
          afterPoint = points[i];
          break;
        } else if (Math.abs(points[i][0] - x) < 1e-10) {
          // Exact match
          return points[i][1];
        }
      }

      // If we have points both before and after, interpolate
      if (beforePoint && afterPoint) {
        const [x1, y1] = beforePoint;
        const [x2, y2] = afterPoint;
        return y1 + ((x - x1) * (y2 - y1)) / (x2 - x1);
      }

      // If we only have points before or after, use those values
      if (beforePoint) return beforePoint[1];
      if (afterPoint) return afterPoint[1];

      // This should never happen based on our checks above
      return "";
    };

    // For each x value, find or interpolate the corresponding y value for each dataset
    sortedXValues.forEach((x) => {
      csvContent += x;

      datasetsToExport.forEach((dataset) => {
        // Find the matching processed dataset
        const processedData = processedDatasets.find(
          (pd) => pd.name === dataset.name
        );

        if (processedData && processedData.validPoints.length > 0) {
          const interpolatedValue = interpolate(x, processedData.validPoints);
          csvContent += ";" + interpolatedValue;
        } else {
          csvContent += ";";
        }
      });

      csvContent += "\n";
    });

    // Create a download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);

    // Use the custom filename or fall back to default
    const filename = exportFilename.trim() || "Zoomed in data";
    link.setAttribute("download", `${filename}.csv`);

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Drag and drop handlers for datasets
  const handleDragStart = (e, id) => {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = "move";
    // Use a transparent image as drag feedback
    const img = new Image();
    img.src =
      "data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=";
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const handleDragOver = (e, targetId) => {
    e.preventDefault();
    if (draggingId === null || draggingId === targetId) return;

    // Find indices of dragged and target items
    const draggedIndex = datasets.findIndex((ds) => ds.id === draggingId);
    const targetIndex = datasets.findIndex((ds) => ds.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Reorder the datasets array
    const newDatasets = [...datasets];
    const [draggedItem] = newDatasets.splice(draggedIndex, 1);
    newDatasets.splice(targetIndex, 0, draggedItem);

    setDatasets(newDatasets);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
  };

  // Function to create a combined dataset from existing datasets
  const createCombinedDataset = () => {
    // Get the form elements with the correct IDs
    const firstDatasetId = (document.getElementById("datasetA") as HTMLInputElement).value;
    const secondDatasetId = (document.getElementById("datasetB") as HTMLInputElement).value;
    const thirdDatasetId = (document.getElementById("datasetC") as HTMLInputElement)?.value || null;
    const fourthDatasetId = (document.getElementById("datasetD") as HTMLInputElement)?.value || null;
    const customEquation = (document.getElementById("customEquation") as HTMLInputElement).value;
    const newDatasetName = (document.getElementById("newDatasetName") as HTMLInputElement).value;

    // Validate input
    if (!firstDatasetId) {
      alert("Please select at least dataset A to combine");
      return;
    }

    // Find the datasets
    const firstDataset = datasets.find(
      (ds) => ds.id.toString() === firstDatasetId
    );
    const secondDataset = secondDatasetId
      ? datasets.find((ds) => ds.id.toString() === secondDatasetId)
      : null;

    const thirdDataset = thirdDatasetId
      ? datasets.find((ds) => ds.id.toString() === thirdDatasetId)
      : null;

    const fourthDataset = fourthDatasetId
      ? datasets.find((ds) => ds.id.toString() === fourthDatasetId)
      : null;

    if (!firstDataset) {
      alert("Dataset A not found");
      return;
    }

    if (secondDatasetId && !secondDataset) {
      alert("Dataset B not found");
      return;
    }

    if (thirdDatasetId && !thirdDataset) {
      alert("Dataset C not found");
      return;
    }

    if (fourthDatasetId && !fourthDataset) {
      alert("Dataset D not found");
      return;
    }

    // Check if equation references datasets that weren't selected
    if (!secondDataset && customEquation.includes("b")) {
      alert("Equation references dataset B, but no dataset B was selected");
      return;
    }

    if (!thirdDataset && customEquation.includes("c")) {
      alert("Equation references dataset C, but no dataset C was selected");
      return;
    }

    if (!fourthDataset && customEquation.includes("d")) {
      alert("Equation references dataset D, but no dataset D was selected");
      return;
    }

    // Create sorted arrays of [x, y] points for each dataset with their offsets applied
    const firstDataPoints = [];
    firstDataset.data.forEach((row) => {
      const x =
        parseFloat(row[firstDataset.xKey]) + (xOffsets[firstDataset.id] || 0);
      const y =
        parseFloat(row[firstDataset.yKey]) + (yOffsets[firstDataset.id] || 0);
      if (!isNaN(x) && !isNaN(y)) {
        firstDataPoints.push([x, y]);
      }
    });

    // Sort by x value for binary search later
    firstDataPoints.sort((a, b) => a[0] - b[0]);

    // Only create these arrays if the datasets exist
    const secondDataPoints = secondDataset ? [] : null;
    const thirdDataPoints = thirdDataset ? [] : null;
    const fourthDataPoints = fourthDataset ? [] : null;

    if (secondDataset) {
      secondDataset.data.forEach((row) => {
        const x =
          parseFloat(row[secondDataset.xKey]) +
          (xOffsets[secondDataset.id] || 0);
        const y =
          parseFloat(row[secondDataset.yKey]) +
          (yOffsets[secondDataset.id] || 0); // Add Y-offset
        if (!isNaN(x) && !isNaN(y)) {
          secondDataPoints.push([x, y]);
        }
      });
      // Sort by x value
      secondDataPoints.sort((a, b) => a[0] - b[0]);
    }

    if (thirdDataset) {
      thirdDataset.data.forEach((row) => {
        const x =
          parseFloat(row[thirdDataset.xKey]) + (xOffsets[thirdDataset.id] || 0);
        const y =
          parseFloat(row[thirdDataset.yKey]) + (yOffsets[thirdDataset.id] || 0); // Add Y-offset
        if (!isNaN(x) && !isNaN(y)) {
          thirdDataPoints.push([x, y]);
        }
      });
      // Sort by x value
      thirdDataPoints.sort((a, b) => a[0] - b[0]);
    }

    if (fourthDataset) {
      fourthDataset.data.forEach((row) => {
        const x =
          parseFloat(row[fourthDataset.xKey]) +
          (xOffsets[fourthDataset.id] || 0);
        const y =
          parseFloat(row[fourthDataset.yKey]) +
          (yOffsets[fourthDataset.id] || 0); // Add Y-offset
        if (!isNaN(x) && !isNaN(y)) {
          fourthDataPoints.push([x, y]);
        }
      });
      // Sort by x value
      fourthDataPoints.sort((a, b) => a[0] - b[0]);
    }

    // Function to find nearest y value for a given x in a dataset
    const findYValueAtX = (x, dataPoints) => {
      if (!dataPoints || dataPoints.length === 0) return null;

      // Check if x is within the dataset range
      if (x < dataPoints[0][0] || x > dataPoints[dataPoints.length - 1][0]) {
        return null;
      }

      // Binary search to find the closest point
      let low = 0;
      let high = dataPoints.length - 1;

      while (low <= high) {
        const mid = Math.floor((low + high) / 2);

        // Exact match
        if (dataPoints[mid][0] === x) {
          return dataPoints[mid][1];
        }

        if (dataPoints[mid][0] < x) {
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }

      // At this point, low > high
      // high is the index of the largest element <= x
      // low is the index of the smallest element >= x

      // If we're at the edges, return the nearest point
      if (high < 0) return dataPoints[0][1];
      if (low >= dataPoints.length) return dataPoints[dataPoints.length - 1][1];

      // Otherwise, interpolate between the two nearest points
      const x1 = dataPoints[high][0];
      const y1 = dataPoints[high][1];
      const x2 = dataPoints[low][0];
      const y2 = dataPoints[low][1];

      // Linear interpolation: y = y1 + (x - x1) * (y2 - y1) / (x2 - x1)
      return y1 + ((x - x1) * (y2 - y1)) / (x2 - x1);
    };

    // Create a safe evaluation function
    const evaluateEquation = (x, equation, a, b, c, d) => {
      try {
        // Define Math functions in the scope
        const sin = Math.sin;
        const cos = Math.cos;
        const tan = Math.tan;
        const log = Math.log;
        const log10 = Math.log10;
        const pow = Math.pow;
        const sqrt = Math.sqrt;
        const abs = Math.abs;
        const PI = Math.PI;
        const E = Math.E;

        // Create a function from the equation string and evaluate it
        return eval(equation);
      } catch (error) {
        console.error("Error evaluating equation:", error);
        return NaN;
      }
    };

    // Get all unique x values from dataset A (use this as the base)
    let allXValues = firstDataPoints.map((point) => point[0]);

    // If the equation uses b, c, or d, we might want to include their x values too
    if (
      customEquation.includes("b") &&
      secondDataPoints &&
      secondDataPoints.length > 0
    ) {
      allXValues = [
        ...allXValues,
        ...secondDataPoints.map((point) => point[0]),
      ];
    }

    if (
      customEquation.includes("c") &&
      thirdDataPoints &&
      thirdDataPoints.length > 0
    ) {
      allXValues = [...allXValues, ...thirdDataPoints.map((point) => point[0])];
    }

    if (
      customEquation.includes("d") &&
      fourthDataPoints &&
      fourthDataPoints.length > 0
    ) {
      allXValues = [
        ...allXValues,
        ...fourthDataPoints.map((point) => point[0]),
      ];
    }

    // Remove duplicates and sort
    const uniqueXValues = [...new Set(allXValues)].sort((a, b) => a - b);

    // Calculate combined y values for all unique x values
    const combinedData = [];

    uniqueXValues.forEach((x) => {
      // Find y values for each dataset at this x value (using interpolation)
      const a = findYValueAtX(x, firstDataPoints);
      const b = findYValueAtX(x, secondDataPoints);
      const c = findYValueAtX(x, thirdDataPoints);
      const d = findYValueAtX(x, fourthDataPoints);

      // Determine if we have all the values needed for the equation
      const hasRequiredValues =
        a !== null &&
        (!customEquation.includes("b") || b !== null) &&
        (!customEquation.includes("c") || c !== null) &&
        (!customEquation.includes("d") || d !== null);

      if (hasRequiredValues) {
        // Evaluate the custom equation
        const resultY = evaluateEquation(x, customEquation, a, b, c, d);

        // Only include valid results (not NaN or Infinity)
        if (!isNaN(resultY) && isFinite(resultY)) {
          combinedData.push({
            "Column 1": x,
            "Column 2": resultY,
          });
        }
      }
    });

    if (combinedData.length === 0) {
      alert("No valid data points found for the combination");
      return;
    }

    // Create a new dataset with the combined data
    const defaultName = `Combined: ${customEquation}`;
    const resultYAxis = (document.getElementById("resultYAxis") as HTMLInputElement)?.value || "left";

    const newDataset = {
      id: Date.now(),
      name: newDatasetName || defaultName,
      color: generateColor(),
      xKey: "Column 1",
      yKey: "Column 2",
      data: combinedData,
      visible: true,
      step: "0.001",
      yAxisSide: resultYAxis, // Use the selected Y-axis
      isCombined: true,
      combinedFrom: {
        first: firstDatasetId,
        second: secondDatasetId,
        third: thirdDatasetId,
        fourth: fourthDatasetId,
        equation: customEquation,
      },
    };

    // Add the new dataset
    setDatasets((prev) => [...prev, newDataset]);
    setXOffsets((prev) => ({ ...prev, [newDataset.id]: 0 }));

    // Reset the form
    (document.getElementById("datasetA") as HTMLInputElement).value = "";
    (document.getElementById("datasetB") as HTMLInputElement).value = "";
    if (document.getElementById("datasetC")) {
      (document.getElementById("datasetC") as HTMLInputElement).value = "";
    }
    if (document.getElementById("datasetD")) {
      (document.getElementById("datasetD") as HTMLInputElement).value = "";
    }
    if (document.getElementById("resultYAxis")) {
      (document.getElementById("resultYAxis") as HTMLInputElement).value = "left";
    }
    (document.getElementById("customEquation") as HTMLInputElement).value = "";
    (document.getElementById("newDatasetName") as HTMLInputElement).value = "";

    // Alert success
    alert(
      `Created new dataset "${newDataset.name}" with ${combinedData.length} data points`
    );
  };

  // Add or subtract offset for a dataset
  const adjustXOffset = (datasetId, amount) => {
    setXOffsets((prev) => ({
      ...prev,
      [datasetId]: (prev[datasetId] || 0) + amount,
    }));
  };

  // Add or subtract offset for a dataset Y value
  // Replace your current adjustYOffset function with this simpler version
  const adjustYOffset = (datasetId, amount) => {
    setYOffsets((prev) => ({
      ...prev,
      [datasetId]: (prev[datasetId] || 0) + amount,
    }));
  };

  // Update dataset properties
  const updateDataset = (id, updates) => {
    setDatasets((prev) =>
      prev.map((ds) => (ds.id === id ? { ...ds, ...updates } : ds))
    );
  };

  // Remove a dataset
  // Replace the removeDataset function
  const removeDataset = (id) => {
    // Find if this dataset is from an equation
    const relatedEquation = customEquations.find((eq) => eq.eqDatasetId === id);

    if (relatedEquation) {
      // If it's an equation dataset, use removeCustomEquation instead
      removeCustomEquation(relatedEquation.id);
    } else {
      // If it's a regular dataset, just remove it
      setDatasets((prev) => prev.filter((ds) => ds.id !== id));
    }
  };

  // Handle file upload and parse CSV
  const handleFileUpload = (file, config) => {
    // Read the file as text to process it
    const reader = new FileReader();
    reader.onload = (e) => {
      const fileText = e.target!.result as string;

      // Split into lines and filter out empty lines
      const lines = fileText.split("\n").filter((line) => line.trim() !== "");

      // Ensure start row doesn't exceed file length
      const validStartRow = Math.min(config.startRow, lines.length - 1);

      // Get the content from the start row onward
      let effectiveLines = lines.slice(validStartRow);

      // If the file is really big, ask how many rows to import—and sample evenly
      const MAX_IMPORT = 10000;
      if (effectiveLines.length > MAX_IMPORT) {
        const answer = window.prompt(
          `Your file has ${effectiveLines.length} rows. How many would you like to import?`,
          `${MAX_IMPORT}`
        );
        const toImport = parseInt(answer, 10);
        if (
          !isNaN(toImport) &&
          toImport > 0 &&
          toImport < effectiveLines.length
        ) {
          const total = effectiveLines.length;
          const step = total / toImport;
          const sampled = [];
          for (let i = 0; i < toImport; i++) {
            // pick line at roughly i * (total/toImport)
            const idx = Math.floor(i * step);
            sampled.push(effectiveLines[idx]);
          }
          effectiveLines = sampled;
        }
      }

      if (effectiveLines.length === 0) {
        alert(
          "No valid data found after start row. Please check your file format and start row setting."
        );
        return;
      }

      // Determine column count from the first effective line
      const firstLine = effectiveLines[0];
      const columns = firstLine
        .split(config.delimiter)
        .map((item) => item.trim());
      const columnCount = columns.length;

      // Create artificial column names
      const artificialHeaders = Array.from(
        { length: columnCount },
        (_, i) => `Column ${i + 1}`
      );

      // Process all lines into proper data objects - ensure we keep ALL data points
      const parsedData = effectiveLines.map((line) => {
        const values = line.split(config.delimiter).map((item) => item.trim());
        const row = {};

        for (let i = 0; i < columnCount; i++) {
          if (i < values.length) {
            // Try to convert to number if possible
            const value = values[i];
            const numValue = parseFloat(value);
            row[artificialHeaders[i]] = !isNaN(numValue) ? numValue : value;
          } else {
            row[artificialHeaders[i]] = "";
          }
        }

        return row;
      });

      // Create a new dataset with the processed data
      const newData = {
        id: Date.now(),
        name: config.name || file.name,
        color: config.color || generateColor(),
        xKey: config.xKey,
        yKey: config.yKey,
        data: parsedData,
        visible: true,
        step: "0.001", // Default step size
        yAxisSide: "left", // Default to left y-axis
      };

      setDatasets((prev) => [...prev, newData]);
      setXOffsets((prev) => ({ ...prev, [newData.id]: 0 }));
      setShowImportForm(false);
    };
    reader.readAsText(file);
  };

  // Add integral visuals (shaded areas and cursors)
  let integralVisuals: any[] = [];

  if (showCursors && cursor1 !== null && cursor2 !== null) {
    // Get all visible datasets for potentially shading
    const visibleDatasets = datasets.filter((ds) => ds.visible !== false);

    // Find the plots that are selected for integration
    const integralDatasetIds = integralBoxes
      .filter((box) => box.plotId)
      .map((box) => box.plotId);

    // Get current axes ranges so cursors don't affect zoom
    let xRange = currentLayout?.xaxis?.range;
    let yRangeLeft = currentLayout?.yaxis?.range;
    let yRangeRight = currentLayout?.yaxis2?.range;

    // Default ranges if not available
    if (!yRangeLeft || !yRangeRight) {
      // Calculate appropriate y ranges from visible data
      let minYLeft = Infinity;
      let maxYLeft = -Infinity;
      let minYRight = Infinity;
      let maxYRight = -Infinity;

      visibleDatasets.forEach((dataset) => {
        dataset.data.forEach((row) => {
          const y = parseFloat(row[dataset.yKey]);
          if (!isNaN(y)) {
            if (dataset.yAxisSide === "right") {
              minYRight = Math.min(minYRight, y);
              maxYRight = Math.max(maxYRight, y);
            } else {
              minYLeft = Math.min(minYLeft, y);
              maxYLeft = Math.max(maxYLeft, y);
            }
          }
        });
      });

      // Set reasonable defaults if no data
      if (minYLeft === Infinity) minYLeft = 0;
      if (maxYLeft === -Infinity) maxYLeft = 100;
      if (minYRight === Infinity) minYRight = 0;
      if (maxYRight === -Infinity) maxYRight = 100;

      yRangeLeft = [minYLeft, maxYLeft];
      yRangeRight = [minYRight, maxYRight];
    }

    // Add cursor lines as vertical traces respecting current zoom
    // Add cursor lines as vertical traces respecting current zoom
    // But use null for layout.shapes to avoid affecting zoom

    // Add shaded areas for selected datasets
    integralDatasetIds.forEach((plotId) => {
      const dataset = datasets.find((ds) => ds.id.toString() === plotId);
      if (!dataset) return;

      // Determine which y-axis to use for this dataset
      const yaxis = dataset.yAxisSide === "right" ? "y2" : "y";

      // Extract data points for this dataset
      // Extract data points for this dataset
      const points = [];
      dataset.data.forEach((row) => {
        const x = parseFloat(row[dataset.xKey]) + (xOffsets[dataset.id] || 0);
        const y = parseFloat(row[dataset.yKey]) + (yOffsets[dataset.id] || 0); // Added Y-offset
        if (!isNaN(x) && !isNaN(y)) {
          points.push([x, y]);
        }
      });

      points.sort((a, b) => a[0] - b[0]);

      // Calculate range for shading
      const xMin = Math.min(cursor1, cursor2);
      const xMax = Math.max(cursor1, cursor2);

      // Find points within the range
      let pointsInRange = points.filter((p) => p[0] >= xMin && p[0] <= xMax);

      // Add boundary points through interpolation if needed
      let shadedX = [];
      let shadedY = [];

      // Add left boundary point if needed
      if (pointsInRange.length > 0 && pointsInRange[0][0] > xMin) {
        const rightPoint = pointsInRange[0];
        let leftPoint = null;

        for (let i = points.length - 1; i >= 0; i--) {
          if (points[i][0] < xMin) {
            leftPoint = points[i];
            break;
          }
        }

        if (leftPoint) {
          // Interpolate at xMin
          const [x1, y1] = leftPoint;
          const [x2, y2] = rightPoint;
          const y = y1 + ((xMin - x1) * (y2 - y1)) / (x2 - x1);

          shadedX.push(xMin);
          shadedY.push(y);
        }
      }

      // Add all points in range
      pointsInRange.forEach((p) => {
        shadedX.push(p[0]);
        shadedY.push(p[1]);
      });

      // Add right boundary point if needed
      if (
        pointsInRange.length > 0 &&
        pointsInRange[pointsInRange.length - 1][0] < xMax
      ) {
        const leftPoint = pointsInRange[pointsInRange.length - 1];
        let rightPoint = null;

        for (let i = 0; i < points.length; i++) {
          if (points[i][0] > xMax) {
            rightPoint = points[i];
            break;
          }
        }

        if (rightPoint) {
          // Interpolate at xMax
          const [x1, y1] = leftPoint;
          const [x2, y2] = rightPoint;
          const y = y1 + ((xMax - x1) * (y2 - y1)) / (x2 - x1);

          shadedX.push(xMax);
          shadedY.push(y);
        }
      }

      // Create filled area trace with proper color
      if (shadedX.length > 0) {
        // Generate a transparent version of the plot color
        let fillColor;
        const color = dataset.color;

        // Handle different color formats (hex, rgb, rgba)
        if (color.startsWith("#")) {
          // Convert hex to rgba
          const r = parseInt(color.slice(1, 3), 16);
          const g = parseInt(color.slice(3, 5), 16);
          const b = parseInt(color.slice(5, 7), 16);
          fillColor = `rgba(${r}, ${g}, ${b}, 0.3)`;
        } else if (color.startsWith("rgb(")) {
          // Convert rgb to rgba
          fillColor = color.replace("rgb", "rgba").replace(")", ", 0.3)");
        } else if (color.startsWith("rgba(")) {
          // Already rgba, just adjust opacity
          fillColor = color.replace(/,\s*[\d\.]+\)/, ", 0.3)");
        } else {
          // Fallback
          fillColor = "rgba(0, 0, 255, 0.3)";
        }

        integralVisuals.push({
          x: [...shadedX, shadedX[shadedX.length - 1], shadedX[0], shadedX[0]],
          y: [...shadedY, 0, 0, shadedY[0]],
          fill: "tozeroy",
          fillcolor: fillColor,
          line: { color: "transparent" },
          type: "scattergl",
          mode: "lines",
          yaxis: yaxis, // Use the correct y-axis for this dataset
          showlegend: false,
        });
      }
    });
  }

  // Function to calculate aspect ratio correction
  const getAspectRatioCorrection = () => {
    if (!currentLayout || !currentLayout.xaxis || !currentLayout.yaxis)
      return 1;

    const xRange = currentLayout.xaxis.range;
    const yRange = currentLayout.yaxis.range;

    if (!xRange || !yRange) return 1;

    const xSpan = Math.abs(xRange[1] - xRange[0]);
    const ySpan = Math.abs(yRange[1] - yRange[0]);

    // Assuming the plot has equal pixel dimensions for x and y
    // This gives us the aspect ratio of data units
    return ySpan / xSpan;
  };

  // Add slope visualization if enabled
  // Add slope visualization if enabled
  let slopeVisual: any[] = [];
  if (showSlopeTool && (hoveredPoint || fixedPoint)) {
    const point = fixedPoint || hoveredPoint;
    if (point && point.slope !== undefined) {
      // The slope line keeps a CONSTANT visual length, independent of the
      // point position and of the slope value. Its length is a percentage
      // (slopeLineSize) of the current viewport diagonal.
      //
      // We treat the visible plot area as a square: the X span maps to 1 unit
      // of normalized width and the Y span to 1 unit of normalized height, so
      // the viewport diagonal is sqrt(2). For a data step (t, slope * t) the
      // normalized on-screen length is t * sqrt((1/xSpan)^2 + (slope/ySpan)^2).
      // We solve t so the full line spans (slopeLineSize / 100) * sqrt(2).
      const xRange = currentLayout?.xaxis?.range;
      const yRange = currentLayout?.yaxis?.range;
      const xSpan = xRange
        ? Math.abs(parseFloat(xRange[1]) - parseFloat(xRange[0]))
        : 1;
      const ySpan = yRange
        ? Math.abs(parseFloat(yRange[1]) - parseFloat(yRange[0]))
        : 1;

      const slope = point.slope;
      const targetNorm = (slopeLineSize / 100) * Math.sqrt(2);
      const dirFactor = Math.sqrt(
        Math.pow(1 / xSpan, 2) + Math.pow(slope / ySpan, 2)
      );
      const totalT = dirFactor > 0 ? targetNorm / dirFactor : 0;
      const halfT = totalT / 2;

      const startX = point.x - halfT;
      const endX = point.x + halfT;
      const startY = point.y - slope * halfT;
      const endY = point.y + slope * halfT;

      // Add the slope line
      slopeVisual.push({
        x: [startX, endX],
        y: [startY, endY],
        type: "scattergl",
        mode: "lines",
        line: { color: "red", width: 3 },
        showlegend: false,
        hoverinfo: "skip",
        cliponaxis: false,
        xaxis: "x",
        yaxis: "y",
      });

      // Add reference markers
      if (
        point.previousX !== undefined &&
        (point.previousX !== point.x || point.previousY !== point.y)
      ) {
        slopeVisual.push({
          x: [point.previousX, point.x],
          y: [point.previousY, point.y],
          type: "scattergl",
          mode: "markers",
          marker: {
            color: ["blue", "red"],
            size: [6, 8],
            symbol: ["circle", "circle"],
          },
          showlegend: false,
          hoverinfo: "skip",
          cliponaxis: false,
          xaxis: "x",
          yaxis: "y",
        });
      } else {
        slopeVisual.push({
          x: [point.x],
          y: [point.y],
          type: "scattergl",
          mode: "markers",
          marker: { color: "red", size: 8 },
          showlegend: false,
          hoverinfo: "skip",
          cliponaxis: false,
          xaxis: "x",
          yaxis: "y",
        });
      }
    }
  }

  // Prepare data for Plotly with zoom preservation and ALL data points
  const plotlyData = datasets.map((dataset) => {
    // Extract X and Y values from the dataset
    let xValues = [];
    let yValues = [];

    // Handle different data structures
    if (Array.isArray(dataset.data)) {
      dataset.data.forEach((row) => {
        // Handle both object and array formats
        let xVal, yVal;

        if (typeof row === "object" && row !== null) {
          // For object format data
          xVal = parseFloat(row[dataset.xKey]);
          yVal = parseFloat(row[dataset.yKey]);
        } else if (Array.isArray(row)) {
          // For array format data
          const xIndex = parseInt(dataset.xKey.replace("Column ", "")) - 1;
          const yIndex = parseInt(dataset.yKey.replace("Column ", "")) - 1;
          xVal = parseFloat(row[xIndex]);
          yVal = parseFloat(row[yIndex]);
        }

        // Only add valid data points
        if (!isNaN(xVal) && !isNaN(yVal)) {
          // Apply X-axis and Y-axis offsetsjsm
          xValues.push(xVal + (xOffsets[dataset.id] || 0));
          yValues.push(yVal + (yOffsets[dataset.id] || 0));
        }
      });
    }

    // Determine which Y-axis to use
    const yAxisToUse = dataset.yAxisSide === "right" ? "y2" : "y";

    return {
      x: xValues,
      y: yValues,
      type: "scattergl",
      mode: "lines",
      name: dataset.name,
      line: { color: dataset.color },
      visible: dataset.visible ? true : "legendonly",
      yaxis: yAxisToUse, // This tells Plotly which Y-axis to use
    };
  });

  // Layout config for Plotly
  const layout = {
    autosize: true,
    height: 500,
    margin: { l: 50, r: 50, b: 50, t: 50, pad: 4 },
    dragmode: "pan",
    hovermode: "closest",
    title: "Data Comparison Tool",
    xaxis: {
      title: {
        text: axisTitles.xAxis,
        font: {
          size: 14,
          color: "#000",
        },
      },
      showgrid: true,
      zeroline: true,
    },
    yaxis: {
      title: {
        text: axisTitles.yAxisLeft,
        font: {
          size: 14,
          color: "#000",
        },
      },
      showgrid: true,
      zeroline: true,
      side: "left",
    },
    yaxis2: {
      title: {
        text: axisTitles.yAxisRight,
        font: {
          size: 14,
          color: "#000",
        },
      },
      showgrid: false,
      zeroline: false,
      overlaying: "y",
      side: "right",
    },
    showlegend: true,
    legend: {
      orientation: "h",
      y: -0.2,
    },
  };

  // Config for Plotly
  const config = {
    responsive: true,
    displayModeBar: true,
    modeBarButtonsToAdd: ["zoom2d", "pan2d", "resetScale2d"] as any,
    plotGlPixelRatio: 2, // Increase rendering resolution
    showSendToCloud: false, // Reduce overhead
  };

  // Dataset box style that matches the mockup
  const datasetBoxStyle: React.CSSProperties = {
    border: "1px solid #00f",
    backgroundColor: "#def",
    padding: "8px",
    marginBottom: "10px",
    display: "inline-block",
    width: "320px",
    verticalAlign: "top",
    marginRight: "5px",
    position: "relative",
  };

  const plotLayout = {
    ...(currentLayout || layout),
    xaxis: {
      ...(currentLayout?.xaxis || {}),
      type: xAxisScale,
      title: currentLayout?.xaxis?.title || { text: axisTitles.xAxis },
      // Lock range when slope tool is active
      ...(showSlopeTool && currentLayout?.xaxis?.range
        ? {
            autorange: false,
            range: currentLayout.xaxis.range,
          }
        : {}),
    },
    yaxis: {
      ...(currentLayout?.yaxis || {}),
      type: yAxisLeftScale,
      title: currentLayout?.yaxis?.title || { text: axisTitles.yAxisLeft },
      // Lock range when slope tool is active
      ...(showSlopeTool && currentLayout?.yaxis?.range
        ? {
            autorange: false,
            range: currentLayout.yaxis.range,
          }
        : {}),
    },
    yaxis2: {
      ...(currentLayout?.yaxis2 || {}),
      type: yAxisRightScale,
      title: currentLayout?.yaxis2?.title || { text: axisTitles.yAxisRight },
      overlaying: "y",
      side: "right",
      // Lock range when slope tool is active
      ...(showSlopeTool && currentLayout?.yaxis2?.range
        ? {
            autorange: false,
            range: currentLayout.yaxis2.range,
          }
        : {}),
    },
    shapes: [
      // Keep your existing shapes code here
      ...(currentLayout?.shapes || []),
      ...(showCursors && cursor1 !== null && cursor2 !== null
        ? [
            {
              type: "line",
              x0: cursor1,
              x1: cursor1,
              y0: 0,
              y1: 1,
              yref: "paper",
              line: { color: "red", width: 3 },
            },
            {
              type: "line",
              x0: cursor2,
              x1: cursor2,
              y0: 0,
              y1: 1,
              yref: "paper",
              line: { color: "red", width: 3 },
            },
          ]
        : []),
    ],
  };

  // Separate slope visuals to handle them differently
  const mainData = [...plotlyData, ...integralVisuals];
  const allData = [...mainData];

  if (showSlopeTool && slopeVisual.length > 0) {
    // Add slope visuals but mark them to not affect autorange
    slopeVisual.forEach((visual) => {
      allData.push({
        ...visual,
        cliponaxis: false,
      });
    });
  }

  // Reorder the dragged block so it takes the dropped block's position
  const handleBlockDrop = (targetId: string) => {
    if (!draggingBlock || draggingBlock === targetId) return;
    setBlockOrder((prev) => {
      const next = prev.filter((b) => b !== draggingBlock);
      const targetIdx = next.indexOf(targetId);
      next.splice(targetIdx, 0, draggingBlock);
      return next;
    });
    setDraggingBlock(null);
  };

  // Props shared by every reorderable block wrapper (gray drag handle on the left)
  const blockWrapperProps = (id: string) => ({
    style: {
      order: blockOrder.indexOf(id),
      position: "relative" as const,
      paddingLeft: "18px",
      opacity: draggingBlock === id ? 0.5 : 1,
    },
    onDragOver: (e: React.DragEvent) => e.preventDefault(),
    onDrop: () => handleBlockDrop(id),
  });

  // The gray vertical handle rendered inside each block wrapper
  const blockHandle = (id: string) => (
    <div
      draggable
      onDragStart={() => setDraggingBlock(id)}
      onDragEnd={() => setDraggingBlock(null)}
      title="Arrastra para reordenar este bloque"
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: "10px",
        backgroundColor: "#bbb",
        cursor: "grab",
        borderRadius: "3px",
      }}
    />
  );

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
      {/* Title */}
      <h1 style={{ marginTop: 0, marginBottom: "15px" }}>Visualization tool</h1>

      {/* Plot moved to the top */}
      <div
        style={{
          border: "1px solid #ccc",
          marginBottom: "20px",
          height: "500px",
        }}
      >
        <Plot
          ref={plotRef}
          data={allData} // This part is critical
          layout={plotLayout}
          config={config}
          style={{ width: "100%", height: "100%" }}
          onClick={handlePlotClick}
          onRelayout={handlePlotUpdate}
          onUpdate={handlePlotUpdate}
          onHover={handlePlotHover}
          onUnhover={handlePlotUnhover}
        />
      </div>

      {/* Reorderable tool blocks: drag the gray handle on the left to reorder */}
      <div style={{ display: "flex", flexDirection: "column" }}>
      {/* NEW CURSOR CONTROL SECTION */}
      <div {...blockWrapperProps("cursors")}>
      {blockHandle("cursors")}
      <div
        style={{
          border: "1px solid #ccc",
          padding: "5px",
          marginBottom: "10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ marginRight: "10px" }}>Step:</div>
          <div
            style={{
              position: "relative",
              width: "130px",
              display: "flex",
              alignItems: "center",
            }}
          >
            <input
              type="text"
              value={formatScientificNotation(cursorStep)}
              onChange={(e) => {
                let newStep: number;
                try {
                  newStep = parseFloat(e.target.value);
                  if (isNaN(newStep)) newStep = 0.001;
                } catch (err) {
                  newStep = 0.001;
                }
                setCursorStep(newStep);
              }}
              style={{ width: "100%" }}
            />
            <div
              style={{
                marginLeft: "4px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <button
                onClick={() => setCursorStep((prev) => prev * 10)}
                style={{
                  fontSize: "10px",
                  padding: "0px 3px",
                  lineHeight: "12px",
                  height: "12px",
                }}
              >
                ▲
              </button>
              <button
                onClick={() => setCursorStep((prev) => prev / 10)}
                style={{
                  fontSize: "10px",
                  padding: "0px 3px",
                  lineHeight: "12px",
                  height: "12px",
                }}
              >
                ▼
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ marginRight: "5px" }}>Left cursor</div>
          <button onClick={() => moveCursor(1, -1)}>◀</button>
          <input
            type="text"
            value={cursor1 !== null ? cursor1.toFixed(10) : ""}
            onChange={(e) => setCursorValue(1, e.target.value)}
            style={{ width: "120px", margin: "0 5px" }}
          />
          <button onClick={() => moveCursor(1, 1)}>▶</button>
        </div>

        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ marginRight: "5px" }}>Right cursor</div>
          <button onClick={() => moveCursor(2, -1)}>◀</button>
          <input
            type="text"
            value={cursor2 !== null ? cursor2.toFixed(10) : ""}
            onChange={(e) => setCursorValue(2, e.target.value)}
            style={{ width: "120px", margin: "0 5px" }}
          />
          <button onClick={() => moveCursor(2, 1)}>▶</button>
        </div>

        <div>
          <label
            style={{ display: "flex", alignItems: "center", cursor: "pointer" }}
          >
            <input
              type="checkbox"
              checked={showCursors}
              onChange={(e) => setShowCursors(e.target.checked)}
              style={{ marginRight: "5px" }}
            />
            Show cursors
          </label>
        </div>
      </div>
      </div>

      <div {...blockWrapperProps("dataSeries")}>
      {blockHandle("dataSeries")}
      <div
        style={{
          border: "1px solid #ccc",
          padding: "10px",
          marginBottom: "20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ flexGrow: 1 }}>
            <div style={{ fontWeight: "bold", marginBottom: "10px" }}>
              Data Series:
            </div>
          </div>
          <div>
            <button onClick={() => setShowImportForm(!showImportForm)}>
              Add data
            </button>
          </div>
        </div>

        {showImportForm && (
          <DataImportForm
            onSubmit={handleFileUpload}
            onCancel={() => setShowImportForm(false)}
            exportOption={exportOption}
            setExportOption={setExportOption}
            exportToCSV={exportToCSV}
            exportFilename={exportFilename}
            setExportFilename={setExportFilename}
          />
        )}

        <div
          style={{
            marginTop: "10px",
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          {datasets.map((dataset, index) => (
            <div
              key={dataset.id}
              style={{
                ...datasetBoxStyle,
                opacity: draggingId === dataset.id ? 0.5 : 1,
              }}
              draggable="true"
              onDragStart={(e) => handleDragStart(e, dataset.id)}
              onDragOver={(e) => handleDragOver(e, dataset.id)}
              onDragEnd={handleDragEnd}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "5px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={dataset.visible !== false}
                    onChange={(e) =>
                      updateDataset(dataset.id, { visible: e.target.checked })
                    }
                    style={{ marginRight: "5px" }}
                  />
                  <div
                    style={{
                      width: "16px",
                      height: "16px",
                      backgroundColor: dataset.color,
                      marginRight: "5px",
                      cursor: "pointer",
                      border: "1px solid #999",
                    }}
                    onClick={(e) => {
                      // Create a color input element
                      const input = document.createElement("input");
                      input.type = "color";
                      input.value = dataset.color;

                      // Position it right next to the color box that was clicked
                      const rect = (e.target as HTMLElement).getBoundingClientRect();
                      input.style.position = "absolute";
                      input.style.left = `${rect.right + 5}px`;
                      input.style.top = `${rect.top}px`;
                      input.style.zIndex = "1000";

                      // Add to document and focus
                      document.body.appendChild(input);
                      input.focus();

                      // Flag to track if the input has been removed
                      let inputRemoved = false;

                      // Handle color change
                      input.addEventListener("change", (e) => {
                        updateDataset(dataset.id, { color: (e.target as HTMLInputElement).value });
                        if (!inputRemoved) {
                          document.body.removeChild(input);
                          inputRemoved = true;
                        }
                      });

                      // Also remove when it loses focus
                      input.addEventListener("blur", () => {
                        if (!inputRemoved && document.body.contains(input)) {
                          document.body.removeChild(input);
                          inputRemoved = true;
                        }
                      });

                      // Show the color picker
                      input.click();
                    }}
                  ></div>
                  <input
                    type="text"
                    value={dataset.name}
                    onChange={(e) =>
                      updateDataset(dataset.id, { name: e.target.value })
                    }
                    style={{ width: "180px" }}
                  />
                </div>
                <button
                  onClick={() => removeDataset(dataset.id)}
                  style={{
                    backgroundColor: "transparent",
                    border: "none",
                    color: "red",
                    cursor: "pointer",
                    fontSize: "20px",
                    fontWeight: "bold",
                  }}
                >
                  ×
                </button>
              </div>

              <div style={{ marginBottom: "5px" }}>
                <div>X-Shift:</div>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <button
                    onClick={() => {
                      const stepSize = parseFloat(dataset.step || "0.001");
                      adjustXOffset(dataset.id, -stepSize);
                    }}
                  >
                    ←
                  </button>
                  <input
                    type="text"
                    value={(xOffsets[dataset.id] || 0).toFixed(10)}
                    onChange={(e) => {
                      const newOffset = parseFloat(e.target.value) || 0;
                      setXOffsets((prev) => ({
                        ...prev,
                        [dataset.id]: newOffset,
                      }));
                      //setYOffsets((prev) => ({ ...prev, [newData.id]: 0 }));
                    }}
                    style={{ width: "200px", margin: "0 5px" }}
                  />
                  <button
                    onClick={() => {
                      const stepSize = parseFloat(dataset.step || "0.001");
                      adjustXOffset(dataset.id, stepSize);
                    }}
                  >
                    →
                  </button>
                  <button
                    onClick={() =>
                      setXOffsets((prev) => ({ ...prev, [dataset.id]: 0 }))
                    }
                    style={{ marginLeft: "5px" }}
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: "5px" }}>
                <div>Step:</div>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <input
                    type="text"
                    value={formatScientificNotation(dataset.step || "0.001")}
                    onChange={(e) => {
                      let newStep: number;
                      try {
                        newStep = parseFloat(e.target.value);
                        if (isNaN(newStep)) newStep = 0.001;
                      } catch (err) {
                        newStep = 0.001;
                      }
                      updateDataset(dataset.id, { step: newStep.toString() });
                    }}
                    style={{ width: "120px" }}
                  />
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      marginLeft: "5px",
                    }}
                  >
                    <button
                      onClick={() => {
                        const currentStep = parseFloat(dataset.step || "0.001");
                        const newStep = currentStep * 10;
                        updateDataset(dataset.id, { step: newStep.toString() });
                      }}
                      style={{ fontSize: "10px", padding: "0 3px" }}
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => {
                        const currentStep = parseFloat(dataset.step || "0.001");
                        const newStep = currentStep / 10;
                        updateDataset(dataset.id, { step: newStep.toString() });
                      }}
                      style={{ fontSize: "10px", padding: "0 3px" }}
                    >
                      ▼
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: "5px" }}>
                <div>Y-Shift:</div>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <button
                    onClick={() => {
                      const stepSize = parseFloat(dataset.step || "0.001");
                      adjustYOffset(dataset.id, -stepSize);
                    }}
                  >
                    ←
                  </button>
                  <input
                    type="text"
                    value={(yOffsets[dataset.id] || 0).toFixed(10)}
                    onChange={(e) => {
                      const newOffset = parseFloat(e.target.value) || 0;
                      setYOffsets((prev) => ({
                        ...prev,
                        [dataset.id]: newOffset,
                      }));
                    }}
                    style={{ width: "200px", margin: "0 5px" }}
                  />
                  <button
                    onClick={() => {
                      const stepSize = parseFloat(dataset.step || "0.001");
                      adjustYOffset(dataset.id, stepSize);
                    }}
                  >
                    →
                  </button>
                  <button
                    onClick={() =>
                      setYOffsets((prev) => ({ ...prev, [dataset.id]: 0 }))
                    }
                    style={{ marginLeft: "5px" }}
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div>
                <div>Y-axis:</div>
                <select
                  value={dataset.yAxisSide || "left"}
                  onChange={(e) =>
                    updateDataset(dataset.id, { yAxisSide: e.target.value })
                  }
                  style={{ width: "100%" }}
                >
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>

      </div>

      {/* Slope Visualization Tool */}
      <div {...blockWrapperProps("slope")}>
      {blockHandle("slope")}
      <div
        style={{
          border: "1px solid #ccc",
          padding: "10px",
          marginBottom: "20px",
        }}
      >
        <div style={{ fontWeight: "bold", marginBottom: "10px" }}>
          Slope (Derivative)
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <label style={{ marginRight: "10px" }}>Slope value:</label>
            <input
              type="text"
              value={currentSlope !== null ? currentSlope.toFixed(6) : "N/A"}
              readOnly
              style={{ width: "120px", backgroundColor: "#f0f0f0" }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center" }}>
            <label style={{ marginRight: "10px" }}>Line size (% of view):</label>
            <input
              type="number"
              value={slopeLineSize}
              onChange={(e) =>
                setSlopeLineSize(parseFloat(e.target.value) || 1)
              }
              style={{ width: "80px" }}
              min="1"
              step="1"
              title="Length of the slope line as a percentage of the current viewport diagonal"
            />
            <span style={{ marginLeft: "4px" }}>%</span>
          </div>

          <div style={{ display: "flex", alignItems: "center" }}>
            <label style={{ marginRight: "10px" }}>Smoothing points:</label>
            <input
              type="number"
              value={slopeSmoothingPoints}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 1;
                setSlopeSmoothingPoints(Math.max(1, value));
              }}
              style={{ width: "60px" }}
              min="1"
              step="2"
              title="Number of points to average for slope calculation"
            />
          </div>

          <div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={showSlopeTool}
                onChange={(e) => setShowSlopeTool(e.target.checked)}
                style={{ marginRight: "5px" }}
              />
              Enable slope tool
            </label>
          </div>
        </div>

        {showSlopeTool && (
          <div style={{ marginTop: "10px", fontSize: "12px", color: "#666" }}>
            {fixedPoint
              ? "Click on another point to change position, or disable and re-enable the tool to reset."
              : "Hover over a curve to see the derivative. Click to fix the position."}
            {slopeSmoothingPoints > 1 && (
              <div style={{ marginTop: "5px" }}>
                Smoothing: Using {Math.floor(slopeSmoothingPoints / 2)} points
                before and after the cursor position.
              </div>
            )}
          </div>
        )}
      </div>
      </div>

      <div {...blockWrapperProps("combined")}>
      {blockHandle("combined")}
      <div
        style={{
          border: "1px solid #ccc",
          padding: "10px",
          marginBottom: "20px",
        }}
      >
        <div style={{ fontWeight: "bold", marginBottom: "10px" }}>
          Create Combined Graph
        </div>
        <div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td style={{ width: "110px", paddingBottom: "5px" }}>
                  Dataset "a":
                </td>
                <td style={{ paddingBottom: "5px" }}>
                  <select id="datasetA" style={{ width: "200px" }}>
                    <option value="">Select dataset A</option>
                    {datasets.map((ds) => (
                      <option key={`a-${ds.id}`} value={ds.id}>
                        {ds.name}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
              <tr>
                <td style={{ paddingBottom: "5px" }}>Dataset "b":</td>
                <td style={{ paddingBottom: "5px" }}>
                  <select id="datasetB" style={{ width: "200px" }}>
                    <option value="">Select dataset B</option>
                    {datasets.map((ds) => (
                      <option key={`b-${ds.id}`} value={ds.id}>
                        {ds.name}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
              <tr>
                <td style={{ paddingBottom: "5px" }}>Dataset "c":</td>
                <td style={{ paddingBottom: "5px" }}>
                  <select id="datasetC" style={{ width: "200px" }}>
                    <option value="">Select dataset C</option>
                    {datasets.map((ds) => (
                      <option key={`c-${ds.id}`} value={ds.id}>
                        {ds.name}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
              <tr>
                <td style={{ paddingBottom: "5px" }}>Dataset "d":</td>
                <td style={{ paddingBottom: "5px" }}>
                  <select id="datasetD" style={{ width: "200px" }}>
                    <option value="">Select dataset D</option>
                    {datasets.map((ds) => (
                      <option key={`d-${ds.id}`} value={ds.id}>
                        {ds.name}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
              <tr>
                <td style={{ paddingBottom: "5px" }}>Y-Axis for result:</td>
                <td style={{ paddingBottom: "5px" }}>
                  <select id="resultYAxis" style={{ width: "200px" }}>
                    <option value="left">Left (primary)</option>
                    <option value="right">Right (secondary)</option>
                  </select>
                </td>
              </tr>
              <tr>
                <td style={{ paddingBottom: "5px" }}>Name for result:</td>
                <td style={{ paddingBottom: "5px" }}>
                  <input
                    id="newDatasetName"
                    type="text"
                    placeholder="Combined Dataset"
                    style={{ width: "200px" }}
                  />
                </td>
              </tr>
              <tr>
                <td style={{ paddingBottom: "5px" }}>Equation:</td>
                <td style={{ paddingBottom: "5px" }}>
                  <input
                    id="customEquation"
                    type="text"
                    placeholder="e.g., a*b, a/b, a*c+b*d"
                    style={{ width: "200px" }}
                  />
                </td>
              </tr>
              <tr>
                <td colSpan={2} style={{ paddingTop: "5px" }}>
                  <button
                    onClick={createCombinedDataset}
                    disabled={datasets.length < 1}
                  >
                    Create Combined Graph
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      </div>

      {/* === NEW CUSTOM EQUATION BLOCK === */}
      <div {...blockWrapperProps("customEq")}>
      {blockHandle("customEq")}
      <div
        style={{
          border: "1px solid #ccc",
          padding: "10px",
          marginBottom: "20px",
        }}
      >
        <div style={{ fontWeight: "bold", marginBottom: "10px" }}>
          Custom equation
        </div>

        {/* Table for the "Add equation" button */}
        <div style={{ marginBottom: "10px" }}>
          <button onClick={addCustomEquation}>Add equation</button>
        </div>

        {/* Render each custom equation row */}
        {customEquations.map((eq) => (
          <div
            key={eq.id}
            style={{
              border: "1px solid #8f8",
              backgroundColor: "#eeffee",
              padding: "10px",
              marginBottom: "5px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div>
                <label style={{ marginRight: "5px" }}>Name:</label>
                <input
                  type="text"
                  value={eq.name}
                  onChange={(e) =>
                    handleCustomEquationChange(eq.id, "name", e.target.value)
                  }
                  style={{ width: "120px" }}
                />
              </div>
              <div>
                <label style={{ marginRight: "5px" }}>Equation:</label>
                <input
                  type="text"
                  placeholder="e.g. 2*x^2 + 3"
                  value={eq.equation}
                  onChange={(e) =>
                    handleCustomEquationChange(
                      eq.id,
                      "equation",
                      e.target.value
                    )
                  }
                  onKeyDown={(e) => handleEquationKeyDown(e, eq.id)}
                  style={{ width: "150px" }}
                />
              </div>
              {/* Pressing Enter in the equation input calls handleEquationKeyDown */}
              <button onClick={() => confirmCustomEquation(eq.id)}>
                Enter
              </button>
            </div>
            <div>
              <button
                onClick={() => removeCustomEquation(eq.id)}
                style={{
                  backgroundColor: "transparent",
                  border: "none",
                  color: "red",
                  fontWeight: "bold",
                  fontSize: "18px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
      {/* === END CUSTOM EQUATION BLOCK === */}
      </div>

      <div {...blockWrapperProps("axisTitles")}>
      {blockHandle("axisTitles")}
      <div
        style={{
          border: "1px solid #ccc",
          padding: "10px",
          marginBottom: "20px",
        }}
      >
        <div style={{ fontWeight: "bold", marginBottom: "10px" }}>
          Axis Titles:
        </div>
        <div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td style={{ width: "110px", paddingBottom: "5px" }}>
                  X-axis:
                </td>
                <td style={{ paddingBottom: "5px" }}>
                  <input
                    type="text"
                    value={axisTitles.xAxis}
                    onChange={(e) => {
                      const newTitle = e.target.value;
                      setAxisTitles((prev) => ({ ...prev, xAxis: newTitle }));

                      if (currentLayout) {
                        setCurrentLayout((prev) => ({
                          ...prev,
                          xaxis: {
                            ...prev.xaxis,
                            title: {
                              ...prev.xaxis.title,
                              text: newTitle,
                            },
                          },
                        }));
                      }
                    }}
                    style={{ width: "200px" }}
                  />
                </td>
              </tr>
              <tr>
                <td style={{ paddingBottom: "5px" }}>Y-axis (Left):</td>
                <td style={{ paddingBottom: "5px" }}>
                  <input
                    type="text"
                    value={axisTitles.yAxisLeft}
                    onChange={(e) => {
                      const newTitle = e.target.value;
                      setAxisTitles((prev) => ({
                        ...prev,
                        yAxisLeft: newTitle,
                      }));

                      if (currentLayout) {
                        setCurrentLayout((prev) => ({
                          ...prev,
                          yaxis: {
                            ...prev.yaxis,
                            title: {
                              ...prev.yaxis.title,
                              text: newTitle,
                            },
                          },
                        }));
                      }
                    }}
                    style={{ width: "200px" }}
                  />
                </td>
              </tr>
              <tr>
                <td style={{ paddingBottom: "5px" }}>Y-axis (Right):</td>
                <td style={{ paddingBottom: "5px" }}>
                  <input
                    type="text"
                    value={axisTitles.yAxisRight}
                    onChange={(e) => {
                      const newTitle = e.target.value;
                      setAxisTitles((prev) => ({
                        ...prev,
                        yAxisRight: newTitle,
                      }));

                      if (currentLayout) {
                        setCurrentLayout((prev) => ({
                          ...prev,
                          yaxis2: {
                            ...prev.yaxis2,
                            title: {
                              ...prev.yaxis2.title,
                              text: newTitle,
                            },
                          },
                        }));
                      }
                    }}
                    style={{ width: "200px" }}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      </div>

      {/* Export to CSV section */}
      <div {...blockWrapperProps("export")}>
      {blockHandle("export")}
      <div
        style={{
          border: "1px solid #ccc",
          padding: "10px",
          marginBottom: "20px",
        }}
      >
        <div style={{ fontWeight: "bold", marginBottom: "10px" }}>
          Export to csv
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "10px",
          }}
        >
          <div style={{ marginRight: "10px" }}>Export:</div>
          <select
            value={exportOption}
            onChange={(e) => setExportOption(e.target.value)}
            style={{ marginRight: "10px" }}
          >
            <option value="visible">Visible datasets only</option>
            <option value="all">All datasets</option>
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ marginRight: "10px" }}>Name for result:</div>
          <input
            type="text"
            value={exportFilename}
            onChange={(e) => setExportFilename(e.target.value)}
            placeholder="Zoomed in data"
            style={{ width: "200px", marginRight: "10px" }}
          />
          <button onClick={exportToCSV}>Export</button>
        </div>
      </div>

      </div>

      {/* Integral Section */}
      <div {...blockWrapperProps("integral")}>
      {blockHandle("integral")}
      <div
        style={{
          border: "1px solid #ccc",
          padding: "10px",
          marginBottom: "20px",
        }}
      >
        <div style={{ fontWeight: "bold", marginBottom: "10px" }}>Integral</div>

        {integralBoxes.map((box) => (
          <div
            key={box.id}
            style={{
              border: "1px solid #f00",
              padding: "10px",
              marginBottom: "10px",
              backgroundColor: "#fff5f5",
              position: "relative",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "10px",
              }}
            >
              <div style={{ marginRight: "10px" }}>Plot to integrate</div>
              <select
                value={box.plotId}
                onChange={(e) => updateIntegralPlotId(box.id, e.target.value)}
                style={{ width: "200px", marginRight: "20px" }}
              >
                <option value="">Select a plot</option>
                {datasets
                  .filter((ds) => ds.visible !== false)
                  .map((ds) => (
                    <option key={ds.id} value={ds.id}>
                      {ds.name}
                    </option>
                  ))}
              </select>

              <div style={{ marginRight: "10px" }}>Result</div>
              <input
                type="text"
                value={box.result}
                readOnly
                style={{ width: "120px" }}
              />

              <button
                onClick={() => removeIntegralBox(box.id)}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "10px",
                  backgroundColor: "transparent",
                  border: "none",
                  color: "red",
                  fontWeight: "bold",
                  fontSize: "18px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>
          </div>
        ))}

        <button onClick={addIntegralBox} style={{ marginTop: "5px" }}>
          Add Integral
        </button>
      </div>
      </div>

      {/* Axis Scale Toggle Section */}
      <div {...blockWrapperProps("axisScale")}>
      {blockHandle("axisScale")}
      <div
        style={{
          border: "1px solid #ccc",
          padding: "10px",
          marginBottom: "20px",
        }}
      >
        <div style={{ fontWeight: "bold", marginBottom: "10px" }}>
          Axis Scale
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "10px",
          }}
        >
          <div>
            <div style={{ marginBottom: "5px" }}>X-Axis Scale:</div>
            <button
              onClick={() => setXAxisScale("linear")}
              style={{
                marginRight: "5px",
                backgroundColor: xAxisScale === "linear" ? "#4CAF50" : "",
                color: xAxisScale === "linear" ? "white" : "",
              }}
            >
              Linear
            </button>
            <button
              onClick={() => setXAxisScale("log")}
              style={{
                backgroundColor: xAxisScale === "log" ? "#4CAF50" : "",
                color: xAxisScale === "log" ? "white" : "",
              }}
            >
              Log
            </button>
          </div>

          <div>
            <div style={{ marginBottom: "5px" }}>Y-Axis Left Scale:</div>
            <button
              onClick={() => setYAxisLeftScale("linear")}
              style={{
                marginRight: "5px",
                backgroundColor: yAxisLeftScale === "linear" ? "#4CAF50" : "",
                color: yAxisLeftScale === "linear" ? "white" : "",
              }}
            >
              Linear
            </button>
            <button
              onClick={() => setYAxisLeftScale("log")}
              style={{
                backgroundColor: yAxisLeftScale === "log" ? "#4CAF50" : "",
                color: yAxisLeftScale === "log" ? "white" : "",
              }}
            >
              Log
            </button>
          </div>

          <div>
            <div style={{ marginBottom: "5px" }}>Y-Axis Right Scale:</div>
            <button
              onClick={() => setYAxisRightScale("linear")}
              style={{
                marginRight: "5px",
                backgroundColor: yAxisRightScale === "linear" ? "#4CAF50" : "",
                color: yAxisRightScale === "linear" ? "white" : "",
              }}
            >
              Linear
            </button>
            <button
              onClick={() => setYAxisRightScale("log")}
              style={{
                backgroundColor: yAxisRightScale === "log" ? "#4CAF50" : "",
                color: yAxisRightScale === "log" ? "white" : "",
              }}
            >
              Log
            </button>
          </div>
        </div>
      </div>
      </div>
      </div>
      {/* end reorderable tool blocks */}
    </div>
  );
};

export default DataComparisonApp;
