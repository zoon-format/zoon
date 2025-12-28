# zoon-rust

A Rust implementation of [ZOON (Zero Overhead Object Notation)](https://github.com/zoon-format/zoon/blob/main/SPEC.md) - the most token-efficient data format for LLMs.

[![Crates.io](https://img.shields.io/crates/v/zoon-rust)](https://crates.io/crates/zoon-rust)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

## Installation

Add to your `Cargo.toml`:

```toml
[dependencies]
zoon = "0.1"
```

## Usage

### Encoding

```rust
use zoon::encode;
use serde::Serialize;

#[derive(Serialize)]
struct User {
    id: i32,
    name: String,
    role: String,
    active: bool,
}

fn main() {
    let users = vec![
        User { id: 1, name: "Alice".into(), role: "Admin".into(), active: true },
        User { id: 2, name: "Bob".into(), role: "User".into(), active: false },
    ];

    let encoded = zoon::encode(&users).unwrap();
    println!("{}", encoded);
    // # id:i name:s role=Admin|User active:b
    // Alice Admin 1
    // Bob User 0
}
```

### Decoding

```rust
use zoon::decode;
use serde::Deserialize;

#[derive(Deserialize, Debug)]
struct User {
    id: i32,
    name: String,
    role: String,
    active: bool,
}

fn main() {
    let input = "# id:i name:s role:s active:b\n1 Alice Admin 1\n2 Bob User 0";
    let users: Vec<User> = zoon::decode(input).unwrap();
    println!("{:?}", users);
}
```

## API

| Function                                                | Description                           |
| ------------------------------------------------------- | ------------------------------------- |
| `encode<T: Serialize>(value: &T) -> Result<String>`     | Encode any serializable value to ZOON |
| `decode<T: DeserializeOwned>(input: &str) -> Result<T>` | Decode ZOON into a value              |

## Type Mapping

| Rust Type          | ZOON Type | Header |
| ------------------ | --------- | ------ |
| `i32`, `i64`       | Integer   | `:i`   |
| `bool`             | Boolean   | `:b`   |
| `String`           | String    | `:s`   |
| `Option<T>` (None) | Null      | `~`    |
| Auto-increment ID  | Implicit  | `:i+`  |

## License

MIT License. © 2025-PRESENT Carsen Klock.
