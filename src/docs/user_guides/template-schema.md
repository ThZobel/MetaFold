# Template Schema Reference

This comprehensive reference documents the complete MetaFold template schema format, including all field types, validation rules, conditional logic, and advanced features. Use this as a technical reference for creating sophisticated templates and understanding the full capabilities of the MetaFold template system.

![Template Schema Reference](images/reference/template-schema-reference.png)

## Schema Overview

### Template Structure

MetaFold templates use a JSON-based schema format with the following top-level structure:

```json
{
  "id": "unique-template-identifier",
  "name": "Human-readable template name",
  "description": "Detailed template description",
  "version": "1.0.0",
  "type": "folder|experiment",
  "author": "Template creator",
  "created": "ISO 8601 timestamp",
  "modified": "ISO 8601 timestamp",
  "folderStructure": ["array", "of", "folder/paths"],
  "metadata": {
    "field_definitions": "object"
  },
  "validation": {
    "rules": "array"
  },
  "integrations": {
    "configuration": "object"
  },
  "ui": {
    "display_options": "object"
  }
}
```

### Schema Validation

All templates are validated against the MetaFold JSON Schema:
- **Required Fields**: `id`, `name`, `type`, `folderStructure`
- **Optional Fields**: All others with sensible defaults
- **Validation**: Automatic validation on save and load
- **Error Handling**: Detailed error messages for invalid schemas

![Schema Structure](images/reference/schema-structure.png)

## Core Template Properties

### Basic Properties

**Template Identification**
```json
{
  "id": {
    "type": "string",
    "pattern": "^[a-zA-Z0-9_-]+$",
    "maxLength": 50,
    "description": "Unique identifier for template",
    "required": true
  },
  "name": {
    "type": "string",
    "maxLength": 200,
    "description": "Human-readable template name",
    "required": true
  },
  "description": {
    "type": "string",
    "maxLength": 1000,
    "description": "Detailed template description",
    "required": false
  }
}
```

**Version Information**
```json
{
  "version": {
    "type": "string",
    "pattern": "^\\d+\\.\\d+\\.\\d+$",
    "description": "Semantic version (major.minor.patch)",
    "default": "1.0.0"
  },
  "author": {
    "type": "string",
    "maxLength": 100,
    "description": "Template creator identifier",
    "required": false
  },
  "created": {
    "type": "string",
    "format": "date-time",
    "description": "Template creation timestamp",
    "auto_generated": true
  },
  "modified": {
    "type": "string",
    "format": "date-time",
    "description": "Last modification timestamp",
    "auto_updated": true
  }
}
```

**Template Type**
```json
{
  "type": {
    "type": "string",
    "enum": ["folder", "experiment"],
    "description": "Template type determining available features",
    "required": true
  }
}
```

### Folder Structure Definition

**Basic Folder Structure**
```json
{
  "folderStructure": {
    "type": "array",
    "items": {
      "type": "string",
      "pattern": "^[^<>:\"|?*\\\\]+$",
      "description": "Valid folder path using forward slashes"
    },
    "description": "Array of folder paths to create",
    "required": true,
    "examples": [
      "data",
      "data/raw",
      "data/processed", 
      "analysis",
      "results"
    ]
  }
}
```

**Advanced Folder Configuration**
```json
{
  "folderStructure": [
    {
      "path": "data/raw",
      "required": true,
      "description": "Raw experimental data",
      "permissions": "read-write",
      "hidden": false
    },
    {
      "path": "analysis/scripts",
      "required": false,
      "description": "Analysis scripts and code",
      "template_files": ["analysis_template.R"]
    }
  ]
}
```

![Folder Structure](images/reference/folder-structure-schema.png)

## Metadata Field Definitions

### Basic Field Types

**Text Fields**
```json
{
  "field_name": {
    "type": "text",
    "required": true|false,
    "maxLength": 500,
    "minLength": 1,
    "pattern": "regex_pattern",
    "placeholder": "Example input",
    "help_text": "Field description and guidance",
    "default": "default_value",
    "validation_message": "Custom error message"
  }
}
```

**Textarea Fields**
```json
{
  "field_name": {
    "type": "textarea",
    "required": false,
    "maxLength": 2000,
    "minLength": 10,
    "rows": 4,
    "placeholder": "Enter detailed description...",
    "help_text": "Detailed text entry",
    "markdown_support": true
  }
}
```

**Numeric Fields**
```json
{
  "field_name": {
    "type": "number|integer|decimal",
    "required": true,
    "minimum": 0,
    "maximum": 1000,
    "step": 0.1,
    "unit": "°C",
    "precision": 2,
    "help_text": "Numeric value with validation"
  }
}
```

**Date and Time Fields**
```json
{
  "field_name": {
    "type": "date|time|datetime",
    "required": true,
    "format": "YYYY-MM-DD|HH:mm|YYYY-MM-DD HH:mm",
    "minimum": "2020-01-01",
    "maximum": "today",
    "default": "today|now",
    "help_text": "Date or time selection"
  }
}
```

### Selection Fields

**Dropdown Fields**
```json
{
  "field_name": {
    "type": "dropdown",
    "required": true,
    "options": ["Option 1", "Option 2", "Option 3"],
    "allow_custom": false,
    "placeholder": "Select an option...",
    "help_text": "Select from predefined options"
  }
}
```

**Dynamic Options**
```json
{
  "field_name": {
    "type": "dropdown",
    "options_source": {
      "type": "api",
      "endpoint": "https://api.example.com/options",
      "cache_duration": 3600,
      "transform": "data.options",
      "display_field": "name",
      "value_field": "id"
    }
  }
}
```

**Checkbox Groups**
```json
{
  "field_name": {
    "type": "checkbox_group",
    "required": false,
    "options": [
      {"value": "option1", "label": "Option 1", "description": "Description"},
      {"value": "option2", "label": "Option 2", "disabled": true}
    ],
    "min_selections": 1,
    "max_selections": 3,
    "layout": "vertical|horizontal|grid"
  }
}
```

![Field Types](images/reference/field-types-schema.png)

### Advanced Field Types

**Conditional Fields**
```json
{
  "dependent_field": {
    "type": "text",
    "condition": {
      "field": "parent_field",
      "operator": "equals|not_equals|contains|in|gt|lt|gte|lte",
      "value": "trigger_value",
      "values": ["value1", "value2"]
    },
    "help_text": "Field appears when condition is met"
  }
}
```

**Complex Conditional Logic**
```json
{
  "dependent_field": {
    "type": "text",
    "condition": {
      "logic": "and|or",
      "conditions": [
        {"field": "field1", "operator": "equals", "value": "value1"},
        {"field": "field2", "operator": "gt", "value": 10}
      ]
    }
  }
}
```

**Calculated Fields**
```json
{
  "calculated_field": {
    "type": "calculated",
    "formula": "field1 + field2",
    "dependencies": ["field1", "field2"],
    "unit": "μm",
    "precision": 2,
    "display_format": "{value} {unit}",
    "recalculate": "on_change|on_save"
  }
}
```

**File Reference Fields**
```json
{
  "file_field": {
    "type": "file_reference",
    "required": false,
    "allowed_types": [".pdf", ".docx", ".txt"],
    "max_size": "10MB",
    "search_directories": ["protocols/", "documentation/"],
    "auto_discover": true,
    "help_text": "Reference to project file"
  }
}
```

**Lookup Fields**
```json
{
  "lookup_field": {
    "type": "lookup",
    "source": {
      "type": "api|database|file",
      "endpoint": "https://api.example.com/search",
      "method": "GET|POST",
      "authentication": "api_key|oauth|none",
      "search_field": "query",
      "return_fields": ["id", "name", "description"],
      "cache_duration": 1800
    },
    "display_format": "{name} ({id})",
    "help_text": "Search external database"
  }
}
```

### Field Groups and Organization

**Field Groups**
```json
{
  "metadata": {
    "basic_info": {
      "type": "group",
      "title": "Basic Information",
      "description": "Essential project details",
      "collapsible": true,
      "initially_collapsed": false,
      "layout": "vertical|horizontal|grid",
      "fields": {
        "title": {"type": "text", "required": true},
        "description": {"type": "textarea", "required": false}
      }
    }
  }
}
```

**Repeating Field Groups**
```json
{
  "sample_groups": {
    "type": "field_array",
    "title": "Sample Groups",
    "min_items": 1,
    "max_items": 10,
    "add_button_text": "Add Sample Group",
    "remove_button_text": "Remove",
    "item_template": {
      "sample_name": {"type": "text", "required": true},
      "sample_type": {"type": "dropdown", "options": ["Type1", "Type2"]},
      "count": {"type": "integer", "minimum": 1}
    }
  }
}
```

**Nested Field Groups**
```json
{
  "experimental_conditions": {
    "type": "group_array",
    "title": "Experimental Conditions",
    "item_template": {
      "condition_name": {"type": "text", "required": true},
      "parameters": {
        "type": "group",
        "fields": {
          "temperature": {"type": "number", "unit": "°C"},
          "duration": {"type": "number", "unit": "minutes"}
        }
      },
      "measurements": {
        "type": "field_array",
        "item_template": {
          "measurement_type": {"type": "text"},
          "value": {"type": "number"},
          "unit": {"type": "text"}
        }
      }
    }
  }
}
```

![Field Groups](images/reference/field-groups-schema.png)

## Validation Rules

### Field-Level Validation

**Basic Validation**
```json
{
  "field_name": {
    "type": "text",
    "validation": {
      "required": true,
      "pattern": "^[A-Z]{2}[0-9]{4}$",
      "min_length": 6,
      "max_length": 6,
      "message": "Format must be XX0000 (2 letters, 4 numbers)"
    }
  }
}
```

**Numeric Validation**
```json
{
  "numeric_field": {
    "type": "number",
    "validation": {
      "minimum": 0,
      "maximum": 100,
      "exclusive_minimum": true,
      "exclusive_maximum": false,
      "multiple_of": 0.5,
      "message": "Value must be between 0 and 100 (exclusive of 0)"
    }
  }
}
```

**Date Validation**
```json
{
  "date_field": {
    "type": "date",
    "validation": {
      "minimum": "2020-01-01",
      "maximum": "today + 30 days",
      "format": "YYYY-MM-DD",
      "business_days_only": true,
      "message": "Date must be within last 5 years and next 30 days"
    }
  }
}
```

### Cross-Field Validation

**Simple Cross-Field Rules**
```json
{
  "validation_rules": [
    {
      "name": "date_consistency",
      "rule": "end_date >= start_date",
      "message": "End date must be after start date",
      "severity": "error|warning|info"
    }
  ]
}
```

**Complex Validation Rules**
```json
{
  "validation_rules": [
    {
      "name": "sample_consistency",
      "condition": "sample_type == 'Cell Culture'",
      "rule": "cell_line != null && passage_number != null",
      "message": "Cell line and passage number required for cell culture samples",
      "severity": "error"
    },
    {
      "name": "equipment_compatibility",
      "rule": "validate_equipment_compatibility(microscope, objective, filters)",
      "message": "Selected equipment configuration is not compatible",
      "severity": "warning",
      "custom_function": true
    }
  ]
}
```

**Validation Functions**
```json
{
  "custom_validation_functions": {
    "validate_equipment_compatibility": {
      "parameters": ["microscope", "objective", "filters"],
      "implementation": "javascript_function_body",
      "return_type": "boolean",
      "description": "Validates microscope equipment compatibility"
    },
    "calculate_sample_concentration": {
      "parameters": ["volume", "mass"],
      "implementation": "return mass / volume;",
      "return_type": "number",
      "description": "Calculates concentration from mass and volume"
    }
  }
}
```

![Validation Rules](images/reference/validation-rules-schema.png)

## Integration Configuration

### Integration Schema

**Basic Integration Settings**
```json
{
  "integrations": {
    "elabftw": {
      "enabled": true,
      "required": false,
      "default_experiment_type": "Microscopy",
      "default_tags": ["template-generated", "automated"],
      "field_mapping": {
        "title": "experiment_title",
        "description": "experiment_description"
      }
    },
    "omero": {
      "enabled": true,
      "required": false,
      "default_group": "research_group_1",
      "dataset_naming": "{title}_{date}",
      "annotation_mapping": {
        "all_fields": true,
        "prefix": "MetaFold_",
        "exclude": ["internal_notes"]
      }
    }
  }
}
```

**Advanced Integration Configuration**
```json
{
  "integrations": {
    "elabftw": {
      "field_mapping": {
        "custom_mappings": [
          {
            "source_field": "experiment_title",
            "target_field": "title",
            "transform": "uppercase"
          },
          {
            "source_field": "sample_count",
            "target_field": "extra_fields.sample_number",
            "validation": "integer"
          }
        ],
        "conditional_mappings": [
          {
            "condition": "experiment_type == 'Microscopy'",
            "mappings": {
              "microscope_model": "extra_fields.instrument",
              "objective_lens": "extra_fields.objective"
            }
          }
        ]
      },
      "post_creation_actions": [
        {
          "action": "attach_protocol",
          "source": "protocols/main_protocol.pdf",
          "condition": "file_exists"
        },
        {
          "action": "set_status",
          "value": "Running"
        }
      ]
    }
  }
}
```

### External API Integration

**API Configuration Schema**
```json
{
  "external_apis": {
    "equipment_database": {
      "base_url": "https://equipment.institution.edu/api",
      "authentication": {
        "type": "api_key",
        "key_header": "X-API-Key",
        "key_value": "${EQUIPMENT_API_KEY}"
      },
      "endpoints": {
        "microscopes": "/microscopes",
        "objectives": "/objectives",
        "filters": "/filters"
      },
      "cache_duration": 3600,
      "timeout": 10000,
      "retry_attempts": 3
    }
  }
}
```

**Dynamic Field Population**
```json
{
  "dynamic_fields": {
    "microscope_model": {
      "type": "dropdown",
      "options_source": {
        "api": "equipment_database",
        "endpoint": "microscopes",
        "display_field": "model",
        "value_field": "id",
        "filter": {"active": true},
        "sort": "model"
      }
    },
    "compatible_objectives": {
      "type": "dropdown",
      "options_source": {
        "api": "equipment_database",
        "endpoint": "objectives",
        "filter_by_field": "microscope_model",
        "display_field": "description",
        "value_field": "id"
      }
    }
  }
}
```

![Integration Configuration](images/reference/integration-configuration.png)

## User Interface Configuration

### Display Options

**Field Display Configuration**
```json
{
  "ui": {
    "field_display": {
      "layout": "vertical|horizontal|grid",
      "columns": 2,
      "spacing": "compact|normal|relaxed",
      "group_styling": {
        "border": true,
        "background": "#f8f9fa",
        "padding": "medium"
      }
    },
    "form_options": {
      "show_progress": true,
      "auto_save": true,
      "auto_save_interval": 30,
      "validation_on_change": true,
      "confirm_navigation": true
    }
  }
}
```

**Responsive Design**
```json
{
  "ui": {
    "responsive": {
      "breakpoints": {
        "mobile": "< 768px",
        "tablet": "768px - 1024px", 
        "desktop": "> 1024px"
      },
      "mobile_layout": {
        "columns": 1,
        "collapse_groups": true,
        "simplified_validation": true
      },
      "tablet_layout": {
        "columns": 2,
        "group_tabs": true
      }
    }
  }
}
```

**Accessibility Options**
```json
{
  "ui": {
    "accessibility": {
      "high_contrast": true,
      "keyboard_navigation": true,
      "screen_reader_support": true,
      "aria_labels": {
        "custom_labels": {
          "field_name": "Custom ARIA label"
        }
      },
      "focus_indicators": true,
      "error_announcements": true
    }
  }
}
```

### Conditional UI Behavior

**Progressive Disclosure**
```json
{
  "ui": {
    "progressive_disclosure": {
      "basic_fields": ["title", "description", "date"],
      "advanced_toggle": {
        "label": "Show Advanced Options",
        "fields": ["advanced_field1", "advanced_field2"]
      },
      "expert_mode": {
        "condition": "user_experience_level >= 'expert'",
        "additional_fields": ["expert_field1"]
      }
    }
  }
}
```

**Dynamic Help and Guidance**
```json
{
  "ui": {
    "help_system": {
      "tooltips": true,
      "contextual_help": {
        "field_name": {
          "content": "Detailed help content",
          "links": ["https://help.example.com/field_help"],
          "examples": ["Example 1", "Example 2"]
        }
      },
      "guided_tour": {
        "enabled": true,
        "steps": [
          {
            "target": "field_name",
            "content": "Tour step content",
            "position": "bottom"
          }
        ]
      }
    }
  }
}
```

![UI Configuration](images/reference/ui-configuration.png)

## Template Inheritance and Composition

### Template Inheritance

**Base Template Definition**
```json
{
  "id": "base_biology_template",
  "name": "Base Biology Template",
  "type": "experiment",
  "is_base_template": true,
  "inheritance": {
    "allowed_modifications": ["add_fields", "modify_folder_structure"],
    "protected_fields": ["title", "principal_investigator", "date"],
    "version_compatibility": ">=1.0.0"
  },
  "metadata": {
    "core_fields": {
      "title": {"type": "text", "required": true},
      "principal_investigator": {"type": "text", "required": true},
      "date": {"type": "date", "required": true}
    }
  }
}
```

**Child Template Definition**
```json
{
  "id": "microscopy_template",
  "name": "Microscopy Experiment Template", 
  "type": "experiment",
  "inherits_from": "base_biology_template",
  "inheritance": {
    "modifications": {
      "add_fields": {
        "microscope_model": {"type": "dropdown", "options": ["Model1", "Model2"]},
        "objective_lens": {"type": "text", "required": true}
      },
      "modify_folder_structure": {
        "add": ["images/raw", "images/processed"],
        "remove": []
      }
    }
  }
}
```

### Template Composition

**Mixin Templates**
```json
{
  "mixins": {
    "sample_information": {
      "description": "Standard sample information fields",
      "fields": {
        "sample_type": {"type": "dropdown", "options": ["Type1", "Type2"]},
        "sample_id": {"type": "text", "pattern": "^S[0-9]{4}$"},
        "preparation_date": {"type": "date", "required": true}
      }
    },
    "quality_control": {
      "description": "Quality control and validation fields",
      "fields": {
        "qc_passed": {"type": "checkbox", "required": true},
        "qc_notes": {"type": "textarea", "required": false}
      }
    }
  }
}
```

**Composed Template**
```json
{
  "id": "complete_experiment_template",
  "name": "Complete Experiment Template",
  "type": "experiment",
  "composition": {
    "base": "base_biology_template",
    "mixins": ["sample_information", "quality_control"],
    "additional_fields": {
      "experiment_specific_field": {"type": "text"}
    }
  }
}
```

![Template Inheritance](images/reference/template-inheritance.png)

## Advanced Features

### Custom Field Types

**Custom Field Type Definition**
```json
{
  "custom_field_types": {
    "gene_symbol": {
      "base_type": "text",
      "validation": {
        "pattern": "^[A-Z][A-Z0-9-]*$",
        "api_validation": {
          "endpoint": "https://api.ncbi.nlm.nih.gov/gene/",
          "method": "GET",
          "validation_field": "symbol"
        }
      },
      "ui": {
        "autocomplete": {
          "source": "ncbi_gene_api",
          "min_length": 2
        },
        "icon": "gene-icon"
      }
    }
  }
}
```

**Plugin Integration**
```json
{
  "plugins": {
    "ontology_lookup": {
      "version": "1.0.0",
      "enabled": true,
      "configuration": {
        "default_ontology": "GO",
        "cache_duration": 3600
      },
      "field_types": ["ontology_term", "go_term"]
    }
  }
}
```

### Workflow Integration

**Workflow Triggers**
```json
{
  "workflow": {
    "triggers": {
      "on_project_creation": [
        {
          "action": "create_backup",
          "configuration": {"location": "backup_server"}
        },
        {
          "action": "notify_team",
          "condition": "project_type == 'collaborative'",
          "configuration": {"method": "email"}
        }
      ],
      "on_field_change": {
        "sample_type": [
          {
            "action": "update_dependent_fields",
            "configuration": {"fields": ["protocol_reference"]}
          }
        ]
      }
    }
  }
}
```

**State Management**
```json
{
  "state_management": {
    "project_states": ["draft", "active", "completed", "archived"],
    "state_transitions": {
      "draft": ["active"],
      "active": ["completed", "archived"],
      "completed": ["archived"]
    },
    "state_actions": {
      "active": {
        "required_fields": ["all_required"],
        "notifications": ["team_notification"],
        "integrations": ["enable_all"]
      }
    }
  }
}
```

### Performance Optimization

**Lazy Loading Configuration**
```json
{
  "performance": {
    "lazy_loading": {
      "enabled": true,
      "threshold": 50,
      "priority_fields": ["title", "description", "date"],
      "defer_fields": ["advanced_parameters"]
    },
    "caching": {
      "field_options": true,
      "api_responses": true,
      "validation_results": true,
      "cache_duration": 1800
    }
  }
}
```

**Optimization Hints**
```json
{
  "optimization": {
    "hints": {
      "frequent_fields": ["title", "researcher", "date"],
      "expensive_validations": ["api_lookup_field"],
      "large_option_lists": ["equipment_database_field"],
      "conditional_heavy": ["complex_conditional_group"]
    },
    "preloading": {
      "api_data": ["equipment_options", "user_preferences"],
      "validation_rules": ["cross_field_rules"]
    }
  }
}
```

![Advanced Features](images/reference/advanced-features.png)

## Error Handling and Debugging

### Error Schema

**Error Response Format**
```json
{
  "error": {
    "type": "validation_error|schema_error|api_error",
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "field": "field_name_if_applicable",
    "details": {
      "expected": "expected_value_or_format",
      "actual": "actual_value_received",
      "suggestion": "suggested_fix"
    },
    "timestamp": "ISO_8601_timestamp",
    "context": {
      "template_id": "template_identifier",
      "field_path": "nested.field.path",
      "user_action": "action_that_triggered_error"
    }
  }
}
```

**Common Error Types**
```json
{
  "error_types": {
    "INVALID_FIELD_TYPE": {
      "description": "Unsupported or invalid field type",
      "severity": "error",
      "auto_fix": false
    },
    "MISSING_REQUIRED_FIELD": {
      "description": "Required field is missing or empty",
      "severity": "error",
      "auto_fix": false
    },
    "VALIDATION_FAILED": {
      "description": "Field value fails validation rules",
      "severity": "error",
      "auto_fix": false
    },
    "CIRCULAR_DEPENDENCY": {
      "description": "Circular dependency in conditional fields",
      "severity": "error",
      "auto_fix": true
    },
    "API_TIMEOUT": {
      "description": "External API request timed out",
      "severity": "warning",
      "auto_fix": true,
      "retry": true
    }
  }
}
```

### Debugging Features

**Debug Mode Configuration**
```json
{
  "debug": {
    "enabled": false,
    "log_level": "info|debug|trace",
    "features": {
      "field_validation_trace": true,
      "api_request_logging": true,
      "performance_monitoring": true,
      "schema_validation_details": true
    },
    "output": {
      "console": true,
      "file": "/path/to/debug.log",
      "remote": "https://logging.example.com/api"
    }
  }
}
```

**Template Testing Framework**
```json
{
  "testing": {
    "test_cases": [
      {
        "name": "basic_validation",
        "input": {
          "title": "Test Project",
          "date": "2025-01-01"
        },
        "expected": {
          "valid": true,
          "errors": []
        }
      },
      {
        "name": "missing_required_field",
        "input": {
          "date": "2025-01-01"
        },
        "expected": {
          "valid": false,
          "errors": [{"field": "title", "type": "MISSING_REQUIRED_FIELD"}]
        }
      }
    ]
  }
}
```

![Error Handling](images/reference/error-handling.png)

## Version Control and Migration

### Version Management

**Version Schema**
```json
{
  "version_control": {
    "current_version": "1.2.3",
    "schema_version": "2.1.0",
    "compatibility": {
      "minimum_metafold_version": "0.5.0",
      "maximum_metafold_version": "1.x.x"
    },
    "changelog": [
      {
        "version": "1.2.3",
        "date": "2025-01-15",
        "changes": ["Added new field type", "Fixed validation bug"],
        "breaking_changes": false
      }
    ]
  }
}
```

**Migration Rules**
```json
{
  "migration": {
    "from_version": "1.1.0",
    "to_version": "1.2.0",
    "rules": [
      {
        "type": "rename_field",
        "old_name": "sample_count",
        "new_name": "number_of_samples"
      },
      {
        "type": "add_field",
        "field_name": "quality_score",
        "field_definition": {"type": "number", "default": 0}
      },
      {
        "type": "remove_field",
        "field_name": "deprecated_field",
        "migration_strategy": "ignore"
      }
    ]
  }
}
```

### Backward Compatibility

**Compatibility Matrix**
```json
{
  "compatibility": {
    "schema_versions": {
      "2.1.0": {
        "supports": ["2.0.0", "1.9.0"],
        "deprecated": ["1.8.0"],
        "unsupported": ["1.7.0", "earlier"]
      }
    },
    "field_type_evolution": {
      "text": {
        "deprecated_aliases": ["string"],
        "migration_path": "automatic"
      },
      "dropdown": {
        "deprecated_aliases": ["select"],
        "migration_path": "automatic"
      }
    }
  }
}
```

![Version Control](images/reference/version-control.png)

## Best Practices and Guidelines

### Schema Design Best Practices

**Field Design Guidelines**
- Use clear, descriptive field names
- Provide helpful tooltips and examples
- Implement appropriate validation rules
- Consider user experience and workflow
- Plan for future extensibility

**Performance Considerations**
- Limit conditional logic complexity
- Use lazy loading for large option lists
- Cache expensive API calls
- Optimize validation rules
- Consider mobile and tablet users

**Maintainability Guidelines**
- Document all custom logic and validations
- Use consistent naming conventions
- Version templates appropriately
- Test thoroughly before deployment
- Plan migration strategies

### Security Considerations

**Data Protection**
```json
{
  "security": {
    "sensitive_fields": {
      "password_field": {
        "type": "password",
        "encryption": "required",
        "storage": "secure_only"
      }
    },
    "access_control": {
      "field_level": true,
      "role_based": true
    },
    "audit_logging": {
      "field_access": true,
      "modifications": true,
      "export_actions": true
    }
  }
}
```

**Input Sanitization**
```json
{
  "sanitization": {
    "html_fields": {
      "allowed_tags": ["p", "br", "strong", "em"],
      "sanitize_on_input": true
    },
    "sql_injection_prevention": true,
    "xss_protection": true
  }
}
```

## Schema Examples

### Complete Example: Advanced Microscopy Template

```json
{
  "id": "advanced_microscopy_v2",
  "name": "Advanced Microscopy Experiment Template",
  "description": "Comprehensive template for multi-modal microscopy experiments",
  "version": "2.1.0",
  "type": "experiment",
  "author": "Imaging Core Facility",
  "folderStructure": [
    "01_protocols",
    "02_sample_prep",
    "03_imaging/raw",
    "03_imaging/processed", 
    "04_analysis",
    "05_results",
    "06_documentation"
  ],
  "metadata": {
    "basic_info": {
      "type": "group",
      "title": "Basic Information",
      "fields": {
        "experiment_title": {
          "type": "text",
          "required": true,
          "maxLength": 200,
          "help_text": "Descriptive title for the experiment"
        },
        "principal_investigator": {
          "type": "text",
          "required": true,
          "help_text": "Lead researcher"
        },
        "experiment_date": {
          "type": "date",
          "required": true,
          "default": "today"
        }
      }
    },
    "sample_info": {
      "type": "group",
      "title": "Sample Information",
      "fields": {
        "sample_type": {
          "type": "dropdown",
          "required": true,
          "options": ["Fixed Cells", "Live Cells", "Tissue"],
          "help_text": "Type of biological sample"
        },
        "cell_line": {
          "type": "dropdown",
          "condition": {
            "field": "sample_type",
            "operator": "in", 
            "values": ["Fixed Cells", "Live Cells"]
          },
          "options_source": {
            "type": "api",
            "endpoint": "https://lab-db.example.com/cell-lines"
          }
        }
      }
    },
    "imaging_parameters": {
      "type": "group",
      "title": "Imaging Parameters",
      "fields": {
        "microscope_system": {
          "type": "dropdown",
          "required": true,
          "options_source": {
            "type": "api",
            "endpoint": "https://equipment.example.com/microscopes"
          }
        },
        "pixel_size": {
          "type": "calculated",
          "formula": "objective_magnification * 0.1",
          "dependencies": ["objective_magnification"],
          "unit": "μm",
          "precision": 3
        }
      }
    }
  },
  "validation": {
    "rules": [
      {
        "name": "nyquist_sampling",
        "rule": "pixel_size <= (emission_wavelength / (2 * objective_na * 2.3))",
        "message": "Pixel size violates Nyquist sampling criterion",
        "severity": "warning"
      }
    ]
  },
  "integrations": {
    "elabftw": {
      "enabled": true,
      "default_experiment_type": "Microscopy",
      "field_mapping": {
        "experiment_title": "title",
        "principal_investigator": "extra_fields.pi"
      }
    },
    "omero": {
      "enabled": true,
      "annotation_mapping": {
        "all_fields": true,
        "prefix": "MetaFold_"
      }
    }
  },
  "ui": {
    "layout": "vertical",
    "progressive_disclosure": {
      "basic_fields": ["experiment_title", "sample_type"],
      "advanced_toggle": {
        "label": "Advanced Parameters",
        "fields": ["pixel_size", "technical_replicates"]
      }
    }
  }
}
```

This comprehensive reference provides the complete specification for MetaFold template schemas. Use it to create sophisticated, maintainable templates that leverage the full power of the MetaFold system while maintaining compatibility and following best practices.

---

*For additional examples and community templates, visit the MetaFold template repository and community forums.*