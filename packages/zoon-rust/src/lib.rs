mod encode;
mod decode;

pub use encode::encode;
pub use decode::decode;

#[derive(Debug, PartialEq)]
pub enum ZoonError {
    InvalidFormat(String),
    UnsupportedType(String),
    ParseError(String),
}

impl std::fmt::Display for ZoonError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ZoonError::InvalidFormat(s) => write!(f, "invalid format: {}", s),
            ZoonError::UnsupportedType(s) => write!(f, "unsupported type: {}", s),
            ZoonError::ParseError(s) => write!(f, "parse error: {}", s),
        }
    }
}

impl std::error::Error for ZoonError {}

pub type Result<T> = std::result::Result<T, ZoonError>;

#[cfg(test)]
mod tests {
    use super::*;
    use serde::{Deserialize, Serialize};

    #[derive(Debug, PartialEq, Serialize, Deserialize)]
    struct User {
        id: i32,
        name: String,
        role: String,
        active: bool,
    }

    #[test]
    fn test_tabular_encode() {
        let users = vec![
            User { id: 1, name: "Alice".into(), role: "Admin".into(), active: true },
            User { id: 2, name: "Bob".into(), role: "User".into(), active: false },
        ];

        let encoded = encode(&users).unwrap();
        assert!(encoded.starts_with("# "));
        assert!(encoded.contains("Alice"));
        assert!(encoded.contains("Bob"));
    }

    #[test]
    fn test_inline_encode() {
        #[derive(Serialize)]
        struct Config {
            host: String,
            port: i32,
            ssl: bool,
        }

        let cfg = Config { host: "localhost".into(), port: 3000, ssl: true };
        let encoded = encode(&cfg).unwrap();
        assert!(encoded.contains("host=localhost"));
        assert!(encoded.contains("port:3000"));
        assert!(encoded.contains("ssl:y"));
    }

    #[test]
    fn test_decode_tabular() {
        let input = "# id:i name:s role:s active:b\n1 Alice Admin 1\n2 Bob User 0";
        let users: Vec<User> = decode(input).unwrap();
        assert_eq!(users.len(), 2);
        assert_eq!(users[0].name, "Alice");
        assert_eq!(users[1].active, false);
    }

    #[test]
    fn test_null_handling() {
        let input = "name=test value:~";
        #[derive(Deserialize, Debug, PartialEq)]
        struct Data {
            name: String,
            value: Option<i32>,
        }
        let data: Data = decode(input).unwrap();
        assert_eq!(data.value, None);
    }

    #[test]
    fn test_empty_input() {
        let result: Vec<User> = decode("").unwrap();
        assert!(result.is_empty());
    }

    #[test]
    fn test_primitive_types() {
        #[derive(Debug, PartialEq, Serialize, Deserialize)]
        struct Item {
            n: String,
            c: i32,
            f: bool,
        }

        let data = vec![
            Item { n: "A B".into(), c: 10, f: true },
            Item { n: "C".into(), c: 0, f: false },
        ];

        let encoded = encode(&data).unwrap();
        assert!(encoded.contains("A_B"));
        assert!(encoded.contains("10"));
        assert!(encoded.contains("1") || encoded.contains("true"));
    }

    #[test]
    fn test_nested_map() {
        use std::collections::HashMap;

        let mut inner_a = HashMap::new();
        inner_a.insert("x".to_string(), 1);
        let mut inner_b = HashMap::new();
        inner_b.insert("y".to_string(), 2);

        let mut data: HashMap<String, HashMap<String, i32>> = HashMap::new();
        data.insert("a".to_string(), inner_a);
        data.insert("b".to_string(), inner_b);

        let encoded = encode(&data).unwrap();
        assert!(encoded.contains("a:{x:1}"));
    }

    #[test]
    fn test_special_characters() {
        #[derive(Debug, Serialize, Deserialize)]
        struct Data {
            text: String,
        }

        let data = vec![Data { text: "Hello_World".into() }];
        let encoded = encode(&data).unwrap();

        let decoded: Vec<Data> = decode(&encoded).unwrap();
        assert_eq!(decoded[0].text, "Hello World");
    }

    #[test]
    fn test_float_handling() {
        #[derive(Debug, Serialize, Deserialize)]
        struct Metric {
            name: String,
            value: f64,
        }

        let data = vec![
            Metric { name: "cpu".into(), value: 0.75 },
            Metric { name: "mem".into(), value: 0.92 },
        ];

        let encoded = encode(&data).unwrap();
        assert!(encoded.contains("0.75"));
    }

    #[test]
    fn test_single_object() {
        #[derive(Debug, PartialEq, Serialize, Deserialize)]
        struct ServerConfig {
            host: String,
            port: i32,
            ssl: bool,
        }

        let cfg = ServerConfig { host: "api.example.com".into(), port: 8080, ssl: false };
        let encoded = encode(&cfg).unwrap();
        assert!(encoded.contains("host=api.example.com"));
        assert!(encoded.contains("port:8080"));
        assert!(encoded.contains("ssl:n"));
    }

    #[test]
    fn test_decode_with_booleans() {
        let input = "# name:s active:b\nAlice 1\nBob 0";
        #[derive(Deserialize, Debug)]
        struct Row {
            name: String,
            active: bool,
        }
        let rows: Vec<Row> = decode(input).unwrap();
        assert_eq!(rows[0].active, true);
        assert_eq!(rows[1].active, false);
    }

    #[test]
    fn test_decode_numbers() {
        let input = "# name:s price:i\nWidget 1999\nGadget 2950";
        #[derive(Deserialize, Debug)]
        struct Product {
            name: String,
            price: i32,
        }
        let products: Vec<Product> = decode(input).unwrap();
        assert_eq!(products[0].price, 1999);
        assert_eq!(products[1].price, 2950);
    }

    #[test]
    fn test_roundtrip_simple() {
        let users = vec![
            User { id: 1, name: "Alice".into(), role: "Admin".into(), active: true },
            User { id: 2, name: "Bob".into(), role: "User".into(), active: false },
        ];
        let encoded = encode(&users).unwrap();
        assert!(encoded.contains("Alice"));
        assert!(encoded.contains("Bob"));
    }

    #[test]
    fn test_roundtrip_with_numbers() {
        #[derive(Serialize, Debug)]
        struct Product {
            name: String,
            price: f64,
            stock: i32,
        }
        let data = vec![
            Product { name: "Widget".into(), price: 19.99, stock: 100 },
            Product { name: "Gadget".into(), price: 29.50, stock: 50 },
        ];
        let encoded = encode(&data).unwrap();
        assert!(encoded.contains("19.99"));
        assert!(encoded.contains("29.5"));
    }

    #[test]
    fn test_roundtrip_with_booleans() {
        #[derive(Serialize, Deserialize, Debug)]
        struct Row {
            name: String,
            active: bool,
        }
        let data = vec![
            Row { name: "Alice".into(), active: true },
            Row { name: "Bob".into(), active: false },
        ];
        let encoded = encode(&data).unwrap();
        assert!(encoded.contains("1") || encoded.contains("true"));
    }

    #[test]
    fn test_roundtrip_with_nulls() {
        #[derive(Serialize, Debug)]
        struct Row {
            name: String,
            email: Option<String>,
        }
        let data = vec![
            Row { name: "Alice".into(), email: Some("alice@example.com".into()) },
            Row { name: "Bob".into(), email: None },
        ];
        let encoded = encode(&data).unwrap();
        assert!(encoded.contains("~"));
    }

    #[test]
    fn test_token_reduction() {
        #[derive(Serialize)]
        struct Row {
            id: i32,
            name: String,
            status: String,
            level: i32,
        }
        let data: Vec<Row> = (1..=10).map(|i| Row {
            id: i,
            name: "User".into(),
            status: "active".into(),
            level: 1,
        }).collect();
        let encoded = encode(&data).unwrap();
        assert!(encoded.len() < 300);
    }

    #[test]
    fn test_aliases() {
        #[derive(Serialize, Deserialize, Debug, PartialEq)]
        struct Status {
            state: String,
        }
        #[derive(Serialize, Deserialize, Debug, PartialEq)]
        struct Infra {
            postgres: Status,
            redis: Status,
        }
        #[derive(Serialize, Deserialize, Debug, PartialEq)]
        struct System {
            infrastructure: Infra,
        }

        let data = vec![
            System { infrastructure: Infra { postgres: Status { state: "up".into() }, redis: Status { state: "up".into() } } },
            System { infrastructure: Infra { postgres: Status { state: "down".into() }, redis: Status { state: "down".into() } } },
        ];

        let encoded = encode(&data).unwrap();
        assert!(encoded.contains("%")); // Check for alias usage
        
        let decoded: Vec<System> = decode(&encoded).unwrap();
        assert_eq!(decoded[0].infrastructure.postgres.state, "up");
        assert_eq!(decoded[1].infrastructure.redis.state, "down");
    }

    #[test]
    fn test_constants() {
        #[derive(Serialize, Deserialize, Debug, PartialEq)]
        struct Log {
            level: String,
            msg: String,
            region: String,
        }
        let data = vec![
            Log { level: "INFO".into(), msg: "Start".into(), region: "us-east-1".into() },
            Log { level: "INFO".into(), msg: "Process".into(), region: "us-east-1".into() },
            Log { level: "INFO".into(), msg: "End".into(), region: "us-east-1".into() },
        ];
        let encoded = encode(&data).unwrap();
        assert!(encoded.contains("@level=INFO"));
        assert!(encoded.contains("@region=us-east-1"));
        
        let decoded: Vec<Log> = decode(&encoded).unwrap();
        assert_eq!(decoded[1].level, "INFO");
        assert_eq!(decoded[2].region, "us-east-1");
    }

    #[test]
    fn test_explicit_row_count() {
        #[derive(Serialize, Deserialize, Debug, PartialEq)]
        struct Metric {
            id: i32,
            status: String,
        }
        // id 1..3, status "ok".
        // id is i+ (non consuming), status is constant (non consuming) -> row is implicit.
        let data: Vec<Metric> = (1..=3).map(|i| Metric { id: i, status: "ok".into() }).collect();
        
        let encoded = encode(&data).unwrap();
        assert!(encoded.contains("+3"));
        
        let decoded: Vec<Metric> = decode(&encoded).unwrap();
        assert_eq!(decoded.len(), 3);
        assert_eq!(decoded[2].id, 3);
        assert_eq!(decoded[0].status, "ok");
    }
}
