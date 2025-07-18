/**
 * Panel Type Configuration Management
 *
 * Provides configuration classes for different panel types:
 * - Discussion Panel: Enhanced moderated panel with named participants (Sarah, Mike, Lisa)
 * - Security Review Panel: Security-focused analysis panel
 * - Tech Review Panel: Technical architecture review panel
 */

/**
 * Base Panel Configuration Class
 * Provides common configuration structure for all panel types
 */
export class BasePanelConfig {
  constructor(panelType) {
    this.panelType = panelType;
    this.inputDirectory = `input/${panelType}`;
    this.outputDirectory = `output/panel/${panelType}`;
    this.agentDirectory = `src/agents/panel/${panelType}`;
  }

  /**
   * Validates the configuration
   * @returns {Object} Validation result with isValid boolean and errors array
   */
  validate() {
    const errors = [];

    if (!this.panelType) {
      errors.push("Panel type is required");
    }

    if (!this.inputDirectory) {
      errors.push("Input directory is required");
    }

    if (!this.outputDirectory) {
      errors.push("Output directory is required");
    }

    if (!this.agentDirectory) {
      errors.push("Agent directory is required");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Gets the configuration as a plain object
   * @returns {Object} Configuration object
   */
  toObject() {
    return {
      panelType: this.panelType,
      inputDirectory: this.inputDirectory,
      outputDirectory: this.outputDirectory,
      agentDirectory: this.agentDirectory,
      ...this.getTypeSpecificConfig(),
    };
  }

  /**
   * Override in subclasses to provide type-specific configuration
   * @returns {Object} Type-specific configuration
   */
  getTypeSpecificConfig() {
    return {};
  }
}

/**
 * Discussion Panel Configuration
 * Enhanced moderated panel with named participants and podcast format
 */
export class DiscussionConfig extends BasePanelConfig {
  constructor() {
    super("discussion");
    this.format = "tl;dr podcast";
    this.participants = {
      moderator: {
        name: "Host",
        role: "Podcast host and conversation facilitator",
      },
      panel1: {
        name: "Sarah",
        role: "The Challenger - Questions assumptions, high disagreeableness",
      },
      panel2: {
        name: "Mike",
        role: "The Analyst - Balanced, evidence-based approach",
      },
      panel3: {
        name: "Lisa",
        role: "The Explorer - Creative, unconventional thinking",
      },
    };
    this.defaultInteractions = 4;
    this.summaryFocus =
      "Summarize key insights and conclusions from this panel discussion in a podcast-style format";
  }

  getTypeSpecificConfig() {
    return {
      format: this.format,
      participants: this.participants,
      defaultInteractions: this.defaultInteractions,
      summaryFocus: this.summaryFocus,
    };
  }

  validate() {
    const baseValidation = super.validate();
    const errors = [...baseValidation.errors];

    if (!this.participants || Object.keys(this.participants).length !== 4) {
      errors.push(
        "Discussion panel must have exactly 4 participants (moderator, panel1, panel2, panel3)"
      );
    }

    if (!this.format) {
      errors.push("Discussion panel format is required");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Security Review Panel Configuration
 * Security-focused analysis panel for security assessments
 */
export class SecurityConfig extends BasePanelConfig {
  constructor() {
    super("security");
    this.focus = "security analysis";
    this.participants = {
      moderator: {
        name: "Security Lead",
        role: "Security assessment coordinator",
      },
      panel1: {
        name: "Red Team",
        role: "Offensive security perspective - identifies vulnerabilities and attack vectors",
      },
      panel2: {
        name: "Blue Team",
        role: "Defensive security perspective - focuses on detection and mitigation",
      },
      panel3: {
        name: "Risk Assessment",
        role: "Business impact assessment and strategic risk evaluation",
      },
    };
    this.defaultInteractions = 6;
    this.summaryFocus =
      "Provide a comprehensive security assessment summary with risk analysis and recommendations";
  }

  getTypeSpecificConfig() {
    return {
      focus: this.focus,
      participants: this.participants,
      defaultInteractions: this.defaultInteractions,
      summaryFocus: this.summaryFocus,
    };
  }

  validate() {
    const baseValidation = super.validate();
    const errors = [...baseValidation.errors];

    if (!this.participants || Object.keys(this.participants).length !== 4) {
      errors.push(
        "Security panel must have exactly 4 participants (moderator, panel1, panel2, panel3)"
      );
    }

    if (!this.focus) {
      errors.push("Security panel focus is required");
    }

    // Validate required security panel roles
    const requiredRoles = ["moderator", "panel1", "panel2", "panel3"];
    const expectedNames = [
      "Security Lead",
      "Red Team",
      "Blue Team",
      "Risk Assessment",
    ];

    requiredRoles.forEach((role, index) => {
      if (!this.participants[role]) {
        errors.push(`Security panel missing required role: ${role}`);
      } else if (this.participants[role].name !== expectedNames[index]) {
        errors.push(
          `Security panel ${role} should be named "${expectedNames[index]}"`
        );
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Tech Review Panel Configuration
 * Technical architecture review panel for technical assessments
 */
export class TechReviewConfig extends BasePanelConfig {
  constructor() {
    super("techreview");
    this.focus = "technical architecture review";
    this.participants = {
      moderator: {
        name: "Tech Lead",
        role: "Technical review coordinator with balanced facilitation (70% conservative, 30% innovation)",
      },
      panel1: {
        name: "System Architect",
        role: "Design patterns, best practices, maintainability - conservative approach",
      },
      panel2: {
        name: "Performance Engineer",
        role: "Code quality, performance, reliability - conservative best practices",
      },
      panel3: {
        name: "Innovation Engineer",
        role: "Creative solutions, alternatives - occasional innovative input (30% participation)",
      },
    };
    this.defaultInteractions = 5;
    this.summaryFocus =
      "Provide actionable technical recommendations with 70% focus on proven best practices and 30% innovative alternatives";
    this.conversationBalance = {
      conservative: 70,
      innovation: 30,
    };
    this.requiredInputs = ["prd", "designDoc", "codebase"];
  }

  getTypeSpecificConfig() {
    return {
      focus: this.focus,
      participants: this.participants,
      defaultInteractions: this.defaultInteractions,
      summaryFocus: this.summaryFocus,
      conversationBalance: this.conversationBalance,
      requiredInputs: this.requiredInputs,
    };
  }

  validate() {
    const baseValidation = super.validate();
    const errors = [...baseValidation.errors];

    if (!this.participants || Object.keys(this.participants).length !== 4) {
      errors.push(
        "Tech review panel must have exactly 4 participants (moderator, panel1, panel2, panel3)"
      );
    }

    if (!this.focus) {
      errors.push("Tech review panel focus is required");
    }

    // Validate required tech review panel roles
    const requiredRoles = ["moderator", "panel1", "panel2", "panel3"];
    const expectedNames = [
      "Tech Lead",
      "System Architect",
      "Performance Engineer",
      "Innovation Engineer",
    ];

    requiredRoles.forEach((role, index) => {
      if (!this.participants[role]) {
        errors.push(`Tech review panel missing required role: ${role}`);
      } else if (this.participants[role].name !== expectedNames[index]) {
        errors.push(
          `Tech review panel ${role} should be named "${expectedNames[index]}"`
        );
      }
    });

    // Validate conversation balance
    if (!this.conversationBalance ||
        this.conversationBalance.conservative !== 70 ||
        this.conversationBalance.innovation !== 30) {
      errors.push("Tech review panel must maintain 70% conservative, 30% innovation balance");
    }

    // Validate required inputs
    if (!this.requiredInputs || this.requiredInputs.length !== 3) {
      errors.push("Tech review panel must require exactly 3 inputs: prd, designDoc, codebase");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Factory function to create panel configuration instances
 * @param {string} panelType - The type of panel ('discussion', 'security', 'techreview')
 * @returns {BasePanelConfig} Panel configuration instance
 * @throws {Error} If panel type is not supported
 */
export function createPanelConfig(panelType) {
  switch (panelType.toLowerCase()) {
    case "discussion":
      return new DiscussionConfig();
    case "security":
      return new SecurityConfig();
    case "techreview":
      return new TechReviewConfig();
    default:
      throw new Error(
        `Unsupported panel type: ${panelType}. Supported types: discussion, security, techreview`
      );
  }
}

/**
 * Gets all available panel types
 * @returns {Array<string>} Array of supported panel types
 */
export function getAvailablePanelTypes() {
  return ["discussion", "security", "techreview"];
}

/**
 * Validates a panel type string
 * @param {string} panelType - Panel type to validate
 * @returns {boolean} True if valid, false otherwise
 */
export function isValidPanelType(panelType) {
  return getAvailablePanelTypes().includes(panelType.toLowerCase());
}
